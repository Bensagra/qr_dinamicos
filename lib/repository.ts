import { randomBytes, randomUUID } from "node:crypto";
import { appMode } from "./config";
import { authorize, HttpError } from "./http";
import { localStore } from "./local-store";
import { z } from "zod";
import { destinationSchema, isPlaceholder, qrInputSchema, slugPattern, venueDefaultLinks, venueInputSchema, type QRInput, type Venue, type QRRecord } from "./qr";
import { supabase } from "./supabase";
import { venueFiles } from "./menu";
import { removeFiles } from "./storage";
const fields =
  "id,slug,name,destination,design,active,venue_id,kind,scans,created_at,updated_at";
export const newSlug = () => randomBytes(9).toString("base64url");
export function localRecord(input: QRInput, timestamp: string): QRRecord {
  return { ...input, id: randomUUID(), slug: newSlug(), scans: 0, created_at: timestamp, updated_at: timestamp };
}
// Every venue starts with an NFC short link and a menu link pointing to the default destination.
// Venues without any link (new or created before this existed) get them when listed.
const unseeded = (venues: Venue[], records: QRRecord[]) =>
  venues.filter((v) => !records.some((r) => r.venue_id === v.id));
export async function listQRs() {
  const db = await authorize();
  if (!db)
    return localStore((records, venues) => {
      const timestamp = new Date().toISOString();
      for (const venue of unseeded(venues, records))
        records.push(...venueDefaultLinks(venue).map((link) => localRecord(link, timestamp)));
      return [...records].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }, true);
  const list = async () => {
    const { data, error } = await db
      .from("qr_codes")
      .select(fields)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as QRRecord[];
  };
  const records = await list();
  const { data: venues, error } = await db.from("venues").select("id,name,created_at");
  if (error) throw error;
  const pending = unseeded(venues, records);
  if (!pending.length) return records;
  const { error: seedError } = await db
    .from("qr_codes")
    .insert(pending.flatMap(venueDefaultLinks).map((link) => ({ ...link, slug: newSlug() })));
  // 23505: a concurrent request already created this venue's menu.
  if (seedError && seedError.code !== "23505") throw seedError;
  return list();
}
// A QR pointing back into our redirect namespace can form a loop.
function checkLoop(destination: string | null, requestOrigin?: string) {
  const app = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
  if (!destination || !app) return;
  const url = new URL(destination);
  if (url.origin === new URL(app).origin && url.pathname.startsWith("/r/"))
    throw new HttpError(
      "Usá el destino final, no el enlace de otro QR de este panel.",
      400,
    );
}
export async function saveQR(input: unknown, id?: string, requestOrigin?: string) {
  const db = await authorize();
  const parsed = qrInputSchema.parse(input);
  checkLoop(parsed.destination, requestOrigin);
  if (parsed.kind === "menu" && !parsed.venue_id)
    throw new HttpError("Asigná el menú a un local.", 400);
  if (db && parsed.venue_id) {
    const { data, error } = await db.from("venues").select("id").eq("id", parsed.venue_id).maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError("El local no existe o no tenés acceso.", 400);
  }
  const timestamp = new Date().toISOString();
  if (!db)
    return localStore((records, venues) => {
      if (parsed.venue_id && !venues.some(v => v.id === parsed.venue_id))
        throw new HttpError("El local no existe.", 400);
      if (parsed.kind === "menu" && records.some(r => r.venue_id === parsed.venue_id && r.kind === "menu" && r.id !== id))
        throw new HttpError("Este local ya tiene un menú. Editá su enlace para conservar el QR.", 409);
      if (id) {
        const record = records.find((r) => r.id === id);
        if (!record) throw new HttpError("Este QR ya no existe.", 404);
        Object.assign(record, parsed, { updated_at: timestamp });
        return record;
      }
      const record = localRecord(parsed, timestamp);
      records.push(record);
      return record;
    }, true);
  const query = id
    ? db
        .from("qr_codes")
        .update({ ...parsed, updated_at: timestamp })
        .eq("id", id)
    : db
        .from("qr_codes")
        .insert({ ...parsed, slug: newSlug() });
  const { data, error } = await query.select(fields).single();
  if (error) {
    if (error.code === "23505") throw new HttpError("Este local ya tiene un menú. Editá su enlace para conservar el QR.", 409);
    if (error.code === "PGRST116")
      throw new HttpError("Este QR ya no existe.", 404);
    throw error;
  }
  return data as QRRecord;
}
export async function removeQR(id: string) {
  const db = await authorize();
  if (!db)
    return localStore((records) => {
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) throw new HttpError("Este QR ya no existe.", 404);
      records.splice(index, 1);
    }, true);
  const { error } = await db.from("qr_codes").delete().eq("id", id);
  if (error) throw error;
}
export async function resolveQR(
  slug: string,
  count = true,
): Promise<string | null> {
  if (!slugPattern.test(slug)) return null;
  if (appMode() === "setup")
    throw new HttpError("Servicio sin configurar.", 503);
  if (appMode() === "local")
    return localStore((records) => {
      const record = records.find((r) => r.slug === slug && r.active);
      if (!record) return null;
      if (count && record.destination) record.scans += 1;
      return record.destination ?? "";
    }, count);
  const db = await supabase();
  const { data, error } = await db.rpc("resolve_qr", {
    qr_slug: slug,
    count_visit: count,
  });
  if (error) throw error;
  return data as string | null;
}
// An empty QR gets its destination the first time its owner scans it. Afterwards it only changes from the panel.
const notFound = () => new HttpError("Este QR no existe o no es de tu cuenta.", 404);
const configured = () => new HttpError("Este QR ya tiene destino. Podés cambiarlo desde el panel.", 409);
async function findBySlug(db: NonNullable<Awaited<ReturnType<typeof authorize>>>, slug: string) {
  const { data, error } = await db.from("qr_codes").select(fields).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return data as QRRecord;
}
export async function emptyQR(slug: string): Promise<{ name: string }> {
  const db = await authorize();
  if (!slugPattern.test(slug)) throw notFound();
  const record = db
    ? await findBySlug(db, slug)
    : await localStore((records) => records.find((r) => r.slug === slug));
  if (!record) throw notFound();
  if (record.destination) throw configured();
  return { name: record.name };
}
export async function claimQR(slug: string, input: unknown, requestOrigin?: string) {
  const db = await authorize();
  if (!slugPattern.test(slug)) throw notFound();
  const { destination } = z.object({ destination: destinationSchema }).parse(input);
  checkLoop(destination, requestOrigin);
  const timestamp = new Date().toISOString();
  if (!db)
    return localStore((records) => {
      const record = records.find((r) => r.slug === slug);
      if (!record) throw notFound();
      if (record.destination) throw configured();
      Object.assign(record, { destination, updated_at: timestamp });
      return record;
    }, true);
  // Only while still empty, so two first scans can't both set it.
  const { data, error } = await db
    .from("qr_codes")
    .update({ destination, updated_at: timestamp })
    .eq("slug", slug)
    .is("destination", null)
    .select(fields)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as QRRecord;
  await findBySlug(db, slug);
  throw configured();
}

export async function listVenues(): Promise<Venue[]> {
  const db = await authorize();
  if (!db) return localStore((_records, venues) => [...venues].sort((a,b) => a.name.localeCompare(b.name)));
  const { data, error } = await db.from("venues").select("id,name,created_at").order("name");
  if (error) throw error;
  return data;
}
export async function saveVenue(input: unknown, id?: string): Promise<Venue> {
  const db = await authorize();
  const parsed = venueInputSchema.parse(input);
  if (!db) return localStore((records, venues) => {
    if (id) {
      const venue = venues.find(v => v.id === id);
      if (!venue) throw new HttpError("El local ya no existe.", 404);
      Object.assign(venue, parsed);
      return venue;
    }
    const venue = { ...parsed, id: randomUUID(), created_at: new Date().toISOString() };
    venues.push(venue);
    records.push(...venueDefaultLinks(venue).map((link) => localRecord(link, venue.created_at)));
    return venue;
  }, true);
  const query = id ? db.from("venues").update(parsed).eq("id", id) : db.from("venues").insert(parsed);
  const { data, error } = await query.select("id,name,created_at").single();
  if (error?.code === "PGRST116") throw new HttpError("El local ya no existe.", 404);
  if (error) throw error;
  if (!id) {
    const { error: seedError } = await db
      .from("qr_codes")
      .insert(venueDefaultLinks(data).map((link) => ({ ...link, slug: newSlug() })));
    if (seedError) throw seedError;
  }
  return data;
}
export async function removeVenue(id: string) {
  const db = await authorize();
  const inUse = "Mové o eliminá los enlaces del local antes de eliminarlo.";
  // Untouched default links are removed with the venue; edited or opened ones block deletion.
  if (!db) return localStore((records, venues, menus) => {
    const links = records.filter(r => r.venue_id === id);
    if (links.some(r => !isPlaceholder(r))) throw new HttpError(inUse, 409);
    const index = venues.findIndex(v => v.id === id);
    if (index === -1) throw new HttpError("El local ya no existe.", 404);
    venues.splice(index, 1);
    records.splice(0, records.length, ...records.filter(r => r.venue_id !== id));
    const files = [...menus.photos.filter(p => p.venue_id === id).map(p => p.path), ...(menus.pdfs[id] ? [menus.pdfs[id]] : [])];
    menus.photos.splice(0, menus.photos.length, ...menus.photos.filter(p => p.venue_id !== id));
    delete menus.pdfs[id];
    return files;
  }, true).then(files => removeFiles(files));
  const { data: links, error: linksError } = await db.from("qr_codes").select(fields).eq("venue_id", id);
  if (linksError) throw linksError;
  if ((links as QRRecord[]).some(r => !isPlaceholder(r))) throw new HttpError(inUse, 409);
  if (links.length) {
    const { error: cleanupError } = await db.from("qr_codes").delete().in("id", links.map(r => r.id));
    if (cleanupError) throw cleanupError;
  }
  const files = await venueFiles(id);
  const { error } = await db.from("venues").delete().eq("id", id);
  if (error?.code === "23503") throw new HttpError("Mové o eliminá los enlaces del local antes de eliminarlo.", 409);
  if (error) throw error;
  await removeFiles(files).catch(() => undefined);
}
