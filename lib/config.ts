import type { AppMode } from "./qr";
export function appMode(): AppMode {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.ADMIN_EMAIL &&
    process.env.NEXT_PUBLIC_APP_URL
  )
    return "cloud";
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return "local";
  return "setup";
}
