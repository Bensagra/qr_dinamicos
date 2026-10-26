import { NextResponse } from "next/server";
import { claimQR, emptyQR } from "@/lib/repository";
import { body, checkOrigin, fail } from "@/lib/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string }> };
// First scan of an empty QR (see /configurar): only its owner can set the destination, and only once.
export async function GET(_request: Request, context: Context) {
  try {
    return NextResponse.json(
      { qr: await emptyQR((await context.params).slug) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const origin = checkOrigin(request);
    return NextResponse.json({
      record: await claimQR((await context.params).slug, await body(request), origin),
    });
  } catch (error) {
    return fail(error);
  }
}
