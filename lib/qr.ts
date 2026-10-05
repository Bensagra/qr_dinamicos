import { z } from "zod";

export function validDestination(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(foreground: string, background: string) {
  return (luminance(background) + 0.05) / (luminance(foreground) + 0.05);
}

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usá un color hexadecimal de 6 dígitos.");
export const designSchema = z
  .object({
    foreground: hex,
    background: hex,
    dots: z.enum(["square", "rounded", "dots"]),
    corners: z.enum(["square", "extra-rounded", "dot"]),
    logo: z
      .string()
      .max(400000)
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
      .nullable(),
  })
  .refine((d) => contrast(d.foreground, d.background) >= 4.5, {
    message: "Elegí un QR oscuro sobre un fondo claro con mayor contraste.",
  });
export const qrInputSchema = z.object({
  name: z.string().trim().min(1, "Dale un nombre al QR.").max(80),
  destination: z
    .string()
    .trim()
    .max(2048)
    .refine(
      validDestination,
      "Ingresá una URL válida que empiece con https:// o http://.",
    ),
  design: designSchema,
  active: z.boolean(),
  venue_id: z.uuid().nullable().default(null),
  kind: z.enum(["qr", "short", "menu"]).default("qr"),
});
export const venueInputSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre del local.").max(80),
});
export type Venue = z.infer<typeof venueInputSchema> & { id: string; created_at: string };
export type QRDesign = z.infer<typeof designSchema>;
export type QRInput = z.infer<typeof qrInputSchema>;
export type QRRecord = QRInput & {
  id: string;
  slug: string;
  scans: number;
  created_at: string;
  updated_at: string;
};
export type AppMode = "local" | "cloud" | "setup";
export const defaultDesign: QRDesign = {
  foreground: "#173E36",
  background: "#FFFFFF",
  dots: "square",
  corners: "square",
  logo: null,
};
// Placeholder destination for the links every venue starts with; edit them afterwards.
const configuredDefault = process.env.NEXT_PUBLIC_DEFAULT_DESTINATION_URL?.trim();
export const defaultDestination =
  configuredDefault && validDestination(configuredDefault) ? configuredDefault : "https://example.com/";
export function venueDefaultLinks(venue: Venue): QRInput[] {
  return (["short", "menu"] as const).map((kind) => ({
    name: `${kind === "menu" ? "Menú" : "NFC"} · ${venue.name}`.slice(0, 80),
    destination: defaultDestination,
    design: { ...defaultDesign },
    active: true,
    venue_id: venue.id,
    kind,
  }));
}
// Untouched default link: never edited nor opened, so it can go away with its venue.
export const isPlaceholder = (record: QRRecord) =>
  record.destination === defaultDestination && record.scans === 0;
export const slugPattern = /^[A-Za-z0-9_-]{12}$/;
