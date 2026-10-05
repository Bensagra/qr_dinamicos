import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "QR Studio · Tus enlaces, bajo tu control",
  description: "Creá, personalizá y administrá tus códigos QR dinámicos.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html:
              "<!-- THESIS: A compact personal QR workbench, with the live printable artifact beside its controls. OWN-WORLD: chalk-white surfaces, deep forest controls, pale sage proofing canvas, geometric QR samples. STORY: name, link, style, save, download; edit destinations without changing the code. FIRST VIEWPORT: slim persistent workspace rail, contextual topbar, two-column editor and live proof. FORM: user-approved clear compact panel; seed eea93380, user commitment takes precedence. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->",
          }}
        />
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
