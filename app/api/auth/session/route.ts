import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, fail, HttpError, session } from "@/lib/http";
import { supabase } from "@/lib/supabase";
// The invitation / recovery email lands on /bienvenida with tokens in the URL fragment; this stores them as the session cookie.
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const tokens = z.object({ access_token: z.string().min(1).max(4000), refresh_token: z.string().min(1).max(400) }).parse(await body(request));
    const db = await supabase();
    const { error } = await db.auth.setSession(tokens);
    if (error) throw new HttpError("El enlace venció o ya se usó. Pedí que te lo envíen de nuevo.", 401);
    try { await session(); }
    catch (denied) { await db.auth.signOut(); throw denied; }
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
