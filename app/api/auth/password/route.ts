import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, fail, HttpError, session } from "@/lib/http";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await session();
    const { password } = z.object({ password: z.string().min(8, "Usá al menos 8 caracteres.").max(72) }).parse(await body(request));
    const { error } = await (await supabase()).auth.updateUser({ password });
    if (error?.code === "same_password") throw new HttpError("Elegí una contraseña distinta de la anterior.", 400);
    if (error?.code === "weak_password") throw new HttpError("Esa contraseña es muy fácil de adivinar. Probá con otra.", 400);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
