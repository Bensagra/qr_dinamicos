import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { adminClient } from "./admin";
import { appMode } from "./config";

// Public menu files. Supabase Storage in production; .data/files in local development.
const bucket = "menus";
const localRoot = path.join(process.cwd(), ".data", "files");
export const localFile = (name: string) => {
  const target = path.join(localRoot, name);
  if (!target.startsWith(localRoot + path.sep)) throw new Error("Invalid file path.");
  return target;
};
export function publicUrl(name: string, origin: string) {
  return appMode() === "local"
    ? `${origin}/api/files/${name}`
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`;
}
export async function putFile(name: string, data: Uint8Array, contentType: string) {
  if (appMode() === "local") {
    await mkdir(path.dirname(localFile(name)), { recursive: true });
    return writeFile(localFile(name), data);
  }
  const { error } = await adminClient().storage.from(bucket).upload(name, data, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw error;
}
export async function getFile(name: string) {
  if (appMode() === "local") return new Uint8Array(await readFile(localFile(name)));
  const { data, error } = await adminClient().storage.from(bucket).download(name);
  if (error) throw error;
  return new Uint8Array(await data.arrayBuffer());
}
export async function removeFiles(names: string[]) {
  if (!names.length) return;
  if (appMode() === "local") {
    await Promise.all(names.map((name) => rm(localFile(name), { force: true })));
    return;
  }
  const { error } = await adminClient().storage.from(bucket).remove(names);
  if (error) throw error;
}
