import type { Options } from "qr-code-styling";
import type { QRDesign, QRRecord, Venue } from "./qr";

export const kindLabel = (kind: QRRecord["kind"]) =>
  kind === "menu" ? "Menú" : kind === "short" ? "NFC / URL corta" : "QR";

export function qrOptions(data: string, design: QRDesign, type: Options["type"] = "svg"): Options {
  return {
    width: 1024,
    height: 1024,
    type,
    data,
    margin: 112,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { color: design.foreground, type: design.dots },
    cornersSquareOptions: { color: design.foreground, type: design.corners },
    cornersDotOptions: {
      color: design.foreground,
      type: design.corners === "square" ? "square" : "dot",
    },
    backgroundOptions: { color: design.background },
    image: design.logo || undefined,
    imageOptions: { hideBackgroundDots: true, imageSize: 0.25, margin: 8, saveAsBlob: true },
  };
}

const safeName = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 60) || "sin-nombre";

// QR image with "type · venue" and the name printed underneath, so printed sheets stay identifiable.
async function labeledPNG(record: QRRecord, venue: string, origin: string) {
  const { default: QRCode } = await import("qr-code-styling");
  const raw = await new QRCode(qrOptions(`${origin}/r/${record.slug}`, record.design, "canvas")).getRawData("png");
  if (!(raw instanceof Blob)) throw new Error(`No pudimos generar el QR "${record.name}".`);
  const image = await createImageBitmap(raw);
  const footer = 200;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height + footer;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = record.design.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  ctx.fillStyle = record.design.foreground;
  ctx.textAlign = "center";
  const fit = (text: string, weight: number, size: number, y: number) => {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
    while (ctx.measureText(text).width > canvas.width - 96 && text.length > 1) text = text.slice(0, -2) + "…";
    ctx.fillText(text, canvas.width / 2, y);
  };
  const title = `${kindLabel(record.kind)} · ${venue}`;
  fit(title, 700, 56, image.height + 40);
  // Default venue links are already named "Menú · Local"; skip the repeated line.
  if (!title.endsWith(record.name.replace(/^[^·]+· /, ""))) fit(record.name, 400, 40, image.height + 110);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No pudimos exportar la imagen."))), "image/png"),
  );
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Minimal store-only ZIP: PNGs are already compressed, so deflate would gain nothing.
function zip(files: { name: string; data: Uint8Array }[]) {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const header = (size: number) => {
      const buffer = new Uint8Array(size + name.length);
      buffer.set(name, size);
      return [buffer, new DataView(buffer.buffer)] as const;
    };
    const [local, l] = header(30);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, 0x0800, true); // UTF-8 names (accents, ñ)
    l.setUint32(14, crc, true);
    l.setUint32(18, file.data.length, true);
    l.setUint32(22, file.data.length, true);
    l.setUint16(26, name.length, true);
    const [entry, c] = header(46);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, file.data.length, true);
    c.setUint32(24, file.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    parts.push(local, new Uint8Array(file.data));
    central.push(entry);
    offset += local.length + file.data.length;
  }
  const size = central.reduce((sum, e) => sum + e.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, size, true);
  e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}

export async function downloadAll(records: QRRecord[], venues: Venue[], origin: string) {
  const used = new Set<string>();
  const files = [];
  for (const record of records) {
    const venue = venues.find((v) => v.id === record.venue_id)?.name || "Sin local";
    const base = `${safeName(venue)}/${safeName(kindLabel(record.kind))} - ${safeName(record.name)}`;
    let name = base;
    for (let i = 2; used.has(name); i++) name = `${base} (${i})`;
    used.add(name);
    const png = await labeledPNG(record, venue, origin);
    files.push({ name: `${name}.png`, data: new Uint8Array(await png.arrayBuffer()) });
  }
  const url = URL.createObjectURL(zip(files));
  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-studio-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
