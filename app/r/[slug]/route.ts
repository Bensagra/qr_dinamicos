import { resolveQR } from "@/lib/repository";
import { validDestination } from "@/lib/qr";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};
async function handle(
  context: { params: Promise<{ slug: string }> },
  count: boolean,
) {
  try {
    const destination = await resolveQR((await context.params).slug, count);
    if (destination && validDestination(destination))
      return new Response(null, {
        status: 302,
        headers: { ...headers, Location: destination },
      });
    return new Response(
      '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR no disponible</title><body style="font:16px system-ui;background:#f4f6f5;color:#173e36;padding:12vh 8vw"><h1>Este QR no está disponible.</h1><p>El enlace fue pausado o eliminado. Contactá a quien te lo compartió.</p></body></html>',
      {
        status: 404,
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      },
    );
  } catch {
    return new Response(
      "No pudimos abrir el enlace. Volvé a intentar en unos momentos.",
      { status: 503, headers: { ...headers, "Retry-After": "30" } },
    );
  }
}
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handle(context, true);
}
export async function HEAD(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handle(context, false);
}
