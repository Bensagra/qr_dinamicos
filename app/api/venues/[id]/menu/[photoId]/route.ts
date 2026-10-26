import { NextResponse } from "next/server";
import { removePhoto } from "@/lib/menu";
import { checkOrigin, fail } from "@/lib/http";
type Context = { params: Promise<{ id: string; photoId: string }> };
export async function DELETE(request: Request, context: Context) {
  try { const origin = checkOrigin(request); const { id, photoId } = await context.params; return NextResponse.json({ menu: await removePhoto(id, photoId, origin) }); }
  catch (error) { return fail(error); }
}
