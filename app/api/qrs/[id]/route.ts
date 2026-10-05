import { NextResponse } from "next/server";
import { removeQR, saveQR } from "@/lib/repository";
import { body, checkOrigin, fail } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const origin = checkOrigin(request);
    return NextResponse.json({
      record: await saveQR(await body(request), (await context.params).id, origin),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    await removeQR((await context.params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}
