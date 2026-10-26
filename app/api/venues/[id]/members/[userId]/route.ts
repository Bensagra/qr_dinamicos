import { NextResponse } from "next/server";
import { listMembers, removeMember, resendAccess } from "@/lib/members";
import { checkOrigin, fail } from "@/lib/http";
type Context = { params: Promise<{ id: string; userId: string }> };
// Sends the access email again.
export async function POST(request: Request, context: Context) {
  try { const origin = checkOrigin(request); const { id, userId } = await context.params; await resendAccess(id, userId, origin); return NextResponse.json({ ok: true }); }
  catch (error) { return fail(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { checkOrigin(request); const { id, userId } = await context.params; await removeMember(id, userId); return NextResponse.json({ members: await listMembers(id) }); }
  catch (error) { return fail(error); }
}
