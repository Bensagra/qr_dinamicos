import { NextResponse } from "next/server";
import { listVenues, saveVenue } from "@/lib/repository";
import { body, checkOrigin, fail } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ venues: await listVenues() }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try { checkOrigin(request); return NextResponse.json({ venue: await saveVenue(await body(request)) }, { status: 201 }); }
  catch (error) { return fail(error); }
}
