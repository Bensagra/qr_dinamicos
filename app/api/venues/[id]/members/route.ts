import { NextResponse } from "next/server";
import { addMember, listMembers } from "@/lib/members";
import { body, checkOrigin, fail } from "@/lib/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try { return NextResponse.json({ members: await listMembers((await context.params).id) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return fail(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const origin = checkOrigin(request);
    const { id } = await context.params;
    await addMember(id, await body(request), origin);
    return NextResponse.json({ members: await listMembers(id) }, { status: 201 });
  } catch (error) { return fail(error); }
}
