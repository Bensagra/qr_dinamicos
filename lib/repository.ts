import { randomBytes, randomUUID } from "node:crypto";
import { appMode } from "./config";
import { authorize, HttpError } from "./http";
import { localStore } from "./local-store";
import { qrInputSchema, slugPattern, venueInputSchema, type Venue, type QRRecord } from "./qr";
import { supabase } from "./supabase";
const fields =
  "id,slug,name,destination,design,active,venue_id,kind,scans,created_at,updated_at";
export async function listQRs() {
  const db = await authorize();
  if (!db)
    return localStore((records) =>
      [...records].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  const { data, error } = await db
    .from("qr_codes")
    .select(fields)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as QRRecord[];
}
export async function saveQR(input: unknown, id?: string, requestOrigin?: string) {
  const db = await authorize();
  const parsed = qrInputSchema.parse(input);
  // A QR pointing back into our redirect namespace can form a loop.
  if (process.env.NEXT_PUBLIC_APP_URL || requestOrigin) {
    const destination = new URL(parsed.destination);
    if (
      destination.origin === new URL(process.env.NEXT_PUBLIC_APP_URL || requestOrigin!).origin &&
      destination.pathname.startsWith("/r/")
    )
      throw new HttpError(
        "Usá el destino final, no el enlace de otro QR de este panel.",
        400,
      );
  }
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
      const record: QRRecord = {
        ...parsed,
        id: randomUUID(),
        slug: randomBytes(9).toString("base64url"),
        scans: 0,
        created_at: timestamp,
        updated_at: timestamp,
      };
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
        .insert({ ...parsed, slug: randomBytes(9).toString("base64url") });
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
      if (count) record.scans += 1;
      return record.destination;
    }, count);
  const db = await supabase();
  const { data, error } = await db.rpc("resolve_qr", {
    qr_slug: slug,
    count_visit: count,
  });
  if (error) throw error;
  return data as string | null;
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
  if (!db) return localStore((_records, venues) => {
    if (id) {
      const venue = venues.find(v => v.id === id);
      if (!venue) throw new HttpError("El local ya no existe.", 404);
      Object.assign(venue, parsed);
      return venue;
    }
    const venue = { ...parsed, id: randomUUID(), created_at: new Date().toISOString() };
    venues.push(venue);
    return venue;
  }, true);
  const query = id ? db.from("venues").update(parsed).eq("id", id) : db.from("venues").insert(parsed);
  const { data, error } = await query.select("id,name,created_at").single();
  if (error?.code === "PGRST116") throw new HttpError("El local ya no existe.", 404);
  if (error) throw error;
  return data;
}
export async function removeVenue(id: string) {
  const db = await authorize();
  if (!db) return localStore((records, venues) => {
    if (records.some(r => r.venue_id === id)) throw new HttpError("Mové o eliminá los enlaces del local antes de eliminarlo.", 409);
    const index = venues.findIndex(v => v.id === id);
    if (index === -1) throw new HttpError("El local ya no existe.", 404);
    venues.splice(index, 1);
  }, true);
  const { error } = await db.from("venues").delete().eq("id", id);
  if (error?.code === "23503") throw new HttpError("Mové o eliminá los enlaces del local antes de eliminarlo.", 409);
  if (error) throw error;
}
