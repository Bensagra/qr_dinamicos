import { NextResponse } from "next/server";
import { saveVenue, removeVenue } from "@/lib/repository";
import { body, checkOrigin, fail } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try { checkOrigin(request); return NextResponse.json({ venue: await saveVenue(await body(request), (await context.params).id) }); }
  catch (error) { return fail(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { checkOrigin(request); await removeVenue((await context.params).id); return new NextResponse(null, { status: 204 }); }
  catch (error) { return fail(error); }
}
