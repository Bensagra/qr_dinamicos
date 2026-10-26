import test from "node:test";
import assert from "node:assert/strict";
import { buildPdf, jpegInfo } from "../lib/pdf";

// SOI, APP0 (JFIF), then a baseline frame header: 8-bit, 1200x800, 3 components.
const jpeg = (sof = 0xc0, components = 3) =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0), 0xff, sof, 0x00, 0x11, 0x08, 0x04, 0xb0, 0x03, 0x20, components, ...new Array(12).fill(0), 0xff, 0xd9]);

test("reads JPEG dimensions and rejects files a PDF can't embed directly", () => {
  assert.deepEqual(jpegInfo(jpeg()), { width: 800, height: 1200, components: 3 });
  assert.deepEqual(jpegInfo(jpeg(0xc2, 1)), { width: 800, height: 1200, components: 1 });
  assert.equal(jpegInfo(jpeg(0xc3)), null); // lossless
  assert.equal(jpegInfo(jpeg(0xc0, 4)), null); // CMYK
  assert.equal(jpegInfo(new TextEncoder().encode("\x89PNG not a jpeg")), null);
  assert.equal(jpegInfo(new Uint8Array([0xff, 0xd8])), null);
});

test("builds one page per photo with a valid cross-reference table", () => {
  const data = jpeg();
  const pdf = Buffer.from(buildPdf([{ ...jpegInfo(data)!, data }, { width: 100, height: 5000, components: 3, data }]));
  const text = pdf.toString("latin1");
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/Count 2 /);
  assert.match(text, /\/MediaBox \[0 0 595\.28 892\.92\]/);
  // Very tall photos are scaled to fit the 14400pt page limit.
  assert.match(text, /\/MediaBox \[0 0 288\.00 14400\.00\]/);
  const xref = Number(text.match(/startxref\n(\d+)/)![1]);
  assert.equal(text.slice(xref, xref + 4), "xref");
  const offsets = [...text.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  assert.equal(offsets.length, 8);
  offsets.forEach((offset, i) => assert.equal(text.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
});
