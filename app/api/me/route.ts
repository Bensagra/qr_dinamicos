import { NextResponse } from "next/server";
import { adminClient } from "@/lib/admin";
import { fail, session } from "@/lib/http";
export const dynamic = "force-dynamic";
// Tells the panel which experience to show: full panel, or a venue user's menu editor.
export async function GET() {
  try {
    const current = await session();
    if (current.role !== "member") return NextResponse.json({ role: "admin" }, { headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await adminClient().from("venues").select("id,name,created_at").in("id", current.venueIds).order("name");
    if (error) throw error;
    return NextResponse.json({ role: "member", email: current.email, venues: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return fail(error); }
}
