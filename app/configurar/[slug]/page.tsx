import { Claim } from "@/components/claim";
export const metadata = { title: "Elegí el destino · QR Studio" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Claim slug={(await params).slug} />;
}
