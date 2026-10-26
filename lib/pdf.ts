export type JPEGInfo = { width: number; height: number; components: 1 | 3 };

// Reads the frame header of a baseline/progressive JPEG. Returns null for anything a PDF viewer can't embed as-is.
export function jpegInfo(bytes: Uint8Array): JPEGInfo | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; }
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      const components = bytes[i + 9];
      if (bytes[i + 4] !== 8 || !width || !height || (components !== 1 && components !== 3)) return null;
      return { width, height, components };
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}

// One page per photo, A4 width, height following the photo. JPEGs are embedded untouched (DCTDecode).
export function buildPdf(images: (JPEGInfo & { data: Uint8Array })[]) {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const buffer = typeof part === "string" ? Buffer.from(part, "latin1") : Buffer.from(part);
    chunks.push(buffer);
    length += buffer.length;
  };
  const object = (id: number, ...parts: (string | Uint8Array)[]) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  };
  push("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  const pageId = (index: number) => 5 + index * 3;
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] >>`);
  images.forEach((image, index) => {
    const id = 3 + index * 3;
    // PDF pages can't exceed 14400pt; very tall photos get a narrower page instead.
    const scale = Math.min(595.28 / image.width, 14400 / image.height);
    const [w, h] = [image.width * scale, image.height * scale].map((v) => v.toFixed(2));
    object(
      id,
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.components === 1 ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`,
      image.data,
      "\nendstream",
    );
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    object(id + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    object(id + 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${id} 0 R >> >> /Contents ${id + 1} 0 R >>`);
  });
  const xref = length;
  const size = 3 + images.length * 3;
  push(`xref\n0 ${size}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Uint8Array(Buffer.concat(chunks));
}
