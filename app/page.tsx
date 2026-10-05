import { Studio } from "@/components/studio";
import { headers } from "next/headers";
import { appMode } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function Page() {
  const requestHeaders = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    `http://${requestHeaders.get("host") || "localhost:3000"}`;
  return (
    <Studio mode={appMode()} configuredOrigin={origin.replace(/\/$/, "")} />
  );
}
