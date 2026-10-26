import { NextResponse } from "next/server";
import { addPhoto, getMenu, reorderPhotos } from "@/lib/menu";
import { appOrigin, body, checkOrigin, fail, HttpError } from "@/lib/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { return NextResponse.json({ menu: await getMenu((await context.params).id, appOrigin(request)) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return fail(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const origin = checkOrigin(request);
    const form = await request.formData().catch(() => { throw new HttpError("No pudimos recibir la foto. Probá de nuevo.", 400); });
    return NextResponse.json({ menu: await addPhoto((await context.params).id, form.get("photo"), origin) }, { status: 201 });
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { const origin = checkOrigin(request); return NextResponse.json({ menu: await reorderPhotos((await context.params).id, await body(request), origin) }); }
  catch (error) { return fail(error); }
}
