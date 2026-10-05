import { NextResponse } from "next/server";
import { listQRs, saveQR } from "@/lib/repository";
import { body, checkOrigin, fail } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      { records: await listQRs() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    const origin = checkOrigin(request);
    return NextResponse.json(
      { record: await saveQR(await body(request), undefined, origin) },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}
