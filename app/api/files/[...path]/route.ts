import { readFile } from "node:fs/promises";
import { appMode } from "@/lib/config";
import { localFile } from "@/lib/storage";
export const dynamic = "force-dynamic";
// Local development only: in production the menu files are served by Supabase Storage.
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (appMode() !== "local") return new Response("Not found", { status: 404 });
  const name = (await context.params).path.join("/");
  try {
    const data = await readFile(localFile(name));
    return new Response(data, { headers: { "Content-Type": name.endsWith(".pdf") ? "application/pdf" : "image/jpeg", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
