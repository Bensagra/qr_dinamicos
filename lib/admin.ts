import "server-only";
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./http";

// Bypasses Row Level Security: only call it after checking the session in the server.
export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw new HttpError("Falta configurar SUPABASE_SECRET_KEY para el menú en fotos y los usuarios por local.", 503);
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
