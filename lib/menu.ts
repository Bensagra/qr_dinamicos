import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminClient } from "./admin";
import { HttpError, session } from "./http";
import { localStore } from "./local-store";
import { buildPdf, jpegInfo } from "./pdf";
import { defaultDesign, type Menu, type MenuPhoto } from "./qr";
import { localRecord, newSlug } from "./repository";
import { getFile, publicUrl, putFile, removeFiles } from "./storage";

const maxPhotos = 40;
// Photos are resized in the browser before upload; this also stays under Vercel's request limit.
const maxPhotoBytes = 4_000_000;
const photoFields = "id,venue_id,path,width,height,position,created_at";
type DB = ReturnType<typeof adminClient> | null;

// The owner manages every venue; venue users only the venues they were invited to.
async function access(venueId: string): Promise<DB> {
  const notFound = new HttpError("El local no existe o no tenés acceso.", 404);
  if (!z.uuid().safeParse(venueId).success) throw notFound;
  const current = await session();
  if (current.role === "local") {
    if (!(await localStore((_records, venues) => venues.some((v) => v.id === venueId)))) throw notFound;
    return null;
  }
  if (current.role === "member") {
    if (!current.venueIds.includes(venueId)) throw notFound;
  } else {
    const { data, error } = await current.db.from("venues").select("id").eq("id", venueId).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound;
  }
  return adminClient();
}
async function photos(db: DB, venueId: string): Promise<MenuPhoto[]> {
  if (!db)
    return localStore((_r, _v, menus) =>
      menus.photos.filter((p) => p.venue_id === venueId).sort((a, b) => a.position - b.position),
    );
  const { data, error } = await db.from("menu_photos").select(photoFields).eq("venue_id", venueId).order("position");
  if (error) throw error;
  return data;
}
async function view(db: DB, venueId: string, origin: string): Promise<Menu> {
  const list = await photos(db, venueId);
  let pdf: string | null;
  if (!db) pdf = await localStore((_r, _v, menus) => menus.pdfs[venueId] ?? null);
  else {
    const { data, error } = await db.from("venues").select("menu_pdf").eq("id", venueId).single();
    if (error) throw error;
    pdf = data.menu_pdf;
  }
  return {
    photos: list.map((p) => ({ ...p, url: publicUrl(p.path, origin) })),
    pdf: pdf && publicUrl(pdf, origin),
  };
}
// Points the venue's menu link at the new PDF (creating the link if it was deleted). Returns the previous PDF.
async function setMenuPdf(db: DB, venueId: string, name: string, url: string): Promise<string | null> {
  const timestamp = new Date().toISOString();
  const link = (venueName: string) => ({
    name: `Menú · ${venueName}`.slice(0, 80),
    destination: url,
    design: { ...defaultDesign },
    active: true,
    venue_id: venueId,
    kind: "menu" as const,
  });
  if (!db)
    return localStore((records, venues, menus) => {
      const previous = menus.pdfs[venueId] ?? null;
      menus.pdfs[venueId] = name;
      const menu = records.find((r) => r.venue_id === venueId && r.kind === "menu");
      const venue = venues.find((v) => v.id === venueId);
      if (menu) Object.assign(menu, { destination: url, updated_at: timestamp });
      else if (venue) records.push(localRecord(link(venue.name), timestamp));
      return previous;
    }, true);
  const { data: venue, error } = await db.from("venues").select("name,owner_id,menu_pdf").eq("id", venueId).single();
  if (error) throw error;
  const { error: venueError } = await db.from("venues").update({ menu_pdf: name }).eq("id", venueId);
  if (venueError) throw venueError;
  const { data: updated, error: linkError } = await db
    .from("qr_codes")
    .update({ destination: url, updated_at: timestamp })
    .eq("venue_id", venueId)
    .eq("kind", "menu")
    .select("id");
  if (linkError) throw linkError;
  if (!updated.length) {
    const { error: insertError } = await db
      .from("qr_codes")
      .insert({ ...link(venue.name), owner_id: venue.owner_id, slug: newSlug() });
    if (insertError) throw insertError;
  }
  return venue.menu_pdf;
}
// Rebuilds the PDF from the current photos. With no photos left, the last published PDF stays online.
async function publish(db: DB, venueId: string, origin: string) {
  const list = await photos(db, venueId);
  if (list.length) {
    const images = await Promise.all(
      list.map(async (photo) => {
        const data = await getFile(photo.path);
        const info = jpegInfo(data);
        if (!info) throw new Error("Stored menu photo is not a valid JPEG.");
        return { ...info, data };
      }),
    );
    const name = `${venueId}/menu-${Date.now()}-${randomUUID().slice(0, 8)}.pdf`;
    await putFile(name, buildPdf(images), "application/pdf");
    const previous = await setMenuPdf(db, venueId, name, publicUrl(name, origin));
    if (previous) await removeFiles([previous]).catch(() => undefined);
  }
  return view(db, venueId, origin);
}

export async function getMenu(venueId: string, origin: string) {
  return view(await access(venueId), venueId, origin);
}
export async function addPhoto(venueId: string, file: FormDataEntryValue | null, origin: string) {
  const db = await access(venueId);
  if (!(file instanceof File)) throw new HttpError("Elegí una foto del menú.", 400);
  if (file.size > maxPhotoBytes) throw new HttpError("La foto es demasiado grande. Usá una de hasta 4 MB.", 413);
  const data = new Uint8Array(await file.arrayBuffer());
  const info = jpegInfo(data);
  if (!info) throw new HttpError("No pudimos leer la foto. Subila en JPG o PNG.", 400);
  const current = await photos(db, venueId);
  if (current.length >= maxPhotos) throw new HttpError(`El menú admite hasta ${maxPhotos} fotos.`, 400);
  const photo: MenuPhoto = {
    id: randomUUID(),
    venue_id: venueId,
    path: `${venueId}/photos/${randomUUID()}.jpg`,
    width: info.width,
    height: info.height,
    position: (current.at(-1)?.position ?? -1) + 1,
    created_at: new Date().toISOString(),
  };
  await putFile(photo.path, data, "image/jpeg");
  try {
    if (!db) await localStore((_r, _v, menus) => void menus.photos.push(photo), true);
    else {
      const { error } = await db.from("menu_photos").insert(photo);
      if (error) throw error;
    }
  } catch (error) {
    await removeFiles([photo.path]).catch(() => undefined);
    throw error;
  }
  return publish(db, venueId, origin);
}
export async function removePhoto(venueId: string, photoId: string, origin: string) {
  const db = await access(venueId);
  const photo = (await photos(db, venueId)).find((p) => p.id === photoId);
  if (!photo) throw new HttpError("Esta foto ya no existe.", 404);
  if (!db) await localStore((_r, _v, menus) => void menus.photos.splice(menus.photos.findIndex((p) => p.id === photoId), 1), true);
  else {
    const { error } = await db.from("menu_photos").delete().eq("id", photoId);
    if (error) throw error;
  }
  await removeFiles([photo.path]).catch(() => undefined);
  return publish(db, venueId, origin);
}
export async function reorderPhotos(venueId: string, input: unknown, origin: string) {
  const db = await access(venueId);
  const { order } = z.object({ order: z.array(z.uuid()).max(maxPhotos) }).parse(input);
  const current = await photos(db, venueId);
  if (order.length !== current.length || new Set(order).size !== order.length || current.some((p) => !order.includes(p.id)))
    throw new HttpError("Las fotos cambiaron mientras ordenabas. Recargá la página.", 409);
  if (!db)
    await localStore((_r, _v, menus) => {
      for (const photo of menus.photos) if (photo.venue_id === venueId) photo.position = order.indexOf(photo.id);
    }, true);
  else {
    const results = await Promise.all(
      order.map((id, position) => db.from("menu_photos").update({ position }).eq("id", id).eq("venue_id", venueId)),
    );
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
  }
  return publish(db, venueId, origin);
}
// Files to delete along with a venue (rows go away by cascade).
export async function venueFiles(venueId: string): Promise<string[]> {
  if (!process.env.SUPABASE_SECRET_KEY) return [];
  const db = adminClient();
  const [{ data: list, error }, { data: venue, error: venueError }] = await Promise.all([
    db.from("menu_photos").select("path").eq("venue_id", venueId),
    db.from("venues").select("menu_pdf").eq("id", venueId).maybeSingle(),
  ]);
  if (error) throw error;
  if (venueError) throw venueError;
  return [...list.map((p) => p.path), ...(venue?.menu_pdf ? [venue.menu_pdf] : [])];
}
