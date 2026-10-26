import { NextResponse } from "next/server";
import { appMode } from "./config";
import { supabase } from "./supabase";
import { adminClient } from "./admin";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export const appOrigin = (request: Request) =>
  new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`,
  ).origin;
export function checkOrigin(request: Request) {
  const allowed = appOrigin(request);
  if (request.headers.get("origin") !== allowed)
    throw new HttpError(
      "El origen de la solicitud no es válido. Abrí el panel desde su dominio principal.",
      403,
    );
  return allowed;
}
export type Session =
  | { role: "local" }
  | { role: "admin"; db: Awaited<ReturnType<typeof supabase>>; email: string }
  | { role: "member"; userId: string; email: string; venueIds: string[] };
export const isAdminEmail = (email?: string) =>
  !!email && email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
export async function session(): Promise<Session> {
  const mode = appMode();
  if (mode === "setup")
    throw new HttpError(
      "Falta configurar la conexión. Revisá el README y las variables de entorno.",
      503,
    );
  if (mode === "local") return { role: "local" };
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new HttpError("Ingresá para administrar tus QR.", 401);
  if (isAdminEmail(user.email)) return { role: "admin", db, email: user.email! };
  const denied = new HttpError("Esta cuenta no tiene acceso al panel.", 403);
  if (!process.env.SUPABASE_SECRET_KEY) throw denied;
  const { data, error: membersError } = await adminClient()
    .from("venue_members")
    .select("venue_id")
    .eq("user_id", user.id);
  if (membersError) throw membersError;
  if (!data.length) throw denied;
  return { role: "member", userId: user.id, email: user.email || "", venueIds: data.map((m) => m.venue_id) };
}
// Full panel access: the owner account (or local development). Venue users only manage menu photos.
export async function authorize() {
  const current = await session();
  if (current.role === "member")
    throw new HttpError("Esta cuenta solo puede editar el menú de su local.", 403);
  return current.role === "admin" ? current.db : null;
}
export async function body(request: Request) {
  const value = await request.text();
  if (value.length > 450000)
    throw new HttpError(
      "El logo es demasiado grande. Usá una imagen de hasta 250 KB.",
      413,
    );
  try {
    return JSON.parse(value);
  } catch {
    throw new HttpError("La solicitud no contiene JSON válido.", 400);
  }
}
export function fail(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Revisá los datos." },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "QR operation failed",
    error instanceof Error ? error.message : "Database error",
  );
  return NextResponse.json(
    {
      error:
        "No pudimos completar la operación. Verificá la conexión y volvé a intentar.",
    },
    { status: 500 },
  );
}
