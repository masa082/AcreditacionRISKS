import type { Metadata } from "next";
import "./globals.css";

const BRAND_NAME = "RISKS INTERNATIONAL";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.okacreditado.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${BRAND_NAME} — Certificación de Personas y Competencias`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "Certifica tus competencias profesionales con RISKS INTERNATIONAL. Evaluaciones online, certificados digitales verificables por QR en compliance, riesgos, SARLAFT, SAGRILAFT, SIPLAFT y debida diligencia.",
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME }],
  keywords: [
    "certificación de personas",
    "certificación de competencias",
    "certificación SARLAFT",
    "certificación SAGRILAFT",
    "certificación SIPLAFT",
    "certificación oficial de cumplimiento",
    "certificación compliance",
    "evaluación online de competencias",
    "certificado digital verificable",
    "RISKS INTERNATIONAL certificaciones",
  ],
  openGraph: {
    siteName: BRAND_NAME,
    locale: "es_CO",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
