import type { Metadata } from "next";
import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Evaluación y Certificación de Personas`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Plataforma SaaS multitenant para evaluación, calificación y certificación de personas bajo ISO/IEC 17024.",
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
