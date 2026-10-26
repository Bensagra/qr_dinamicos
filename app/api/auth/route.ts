import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, fail, HttpError, session } from "@/lib/http";
import { appMode } from "@/lib/config";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (appMode() !== "cloud")
      throw new HttpError("Configurá Supabase para habilitar el acceso.", 503);
    const input = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(await body(request));
    const db = await supabase();
    const { error } = await db.auth.signInWithPassword(input);
    if (error)
      throw new HttpError(
        error.status === 429
          ? "Demasiados intentos. Esperá unos minutos."
          : "Email o contraseña incorrectos.",
        error.status === 429 ? 429 : 401,
      );
    // Only the owner and invited venue users may keep the session.
    try {
      await session();
    } catch (denied) {
      await db.auth.signOut();
      throw denied;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    if (appMode() === "cloud") {
      const { error } = await (await supabase()).auth.signOut();
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
