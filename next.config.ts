import type { NextConfig } from "next";

// Headers de seguridad estrictos para todo el sitio. X-Frame-Options:DENY
// impide que el sitio sea embebido en iframes de terceros (defensa contra
// clickjacking).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Para /api/files/* relajamos a SAMEORIGIN: permite que nuestras propias
// páginas embeban PDFs/imágenes como miniatura (carpeta del candidato),
// pero sigue bloqueando que un tercero embeba esos archivos. El resto
// de headers (no-sniff, HSTS, etc.) se mantienen.
const filesHeaders = securityHeaders.map((h) =>
  h.key === "X-Frame-Options" ? { ...h, value: "SAMEORIGIN" } : h,
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "qrcode", "@aws-sdk/client-s3", "nodemailer"],
  // ESLint se configura en una fase posterior; no bloquear el build por ahora.
  eslint: { ignoreDuringBuilds: true },
  // El chequeo de tipos de TypeScript permanece activo (no se ignora).
  async headers() {
    return [
      // Las rutas que sirven archivos del candidato necesitan permitir
      // iframe same-origin para las miniaturas en /panel/candidatos.
      { source: "/api/files/:path*", headers: filesHeaders },
      { source: "/api/payments/:path*", headers: filesHeaders },
      { source: "/api/docs-file/:path*", headers: filesHeaders },
      // Cualquier otra ruta: bloqueo total de embebido.
      { source: "/:path*", headers: securityHeaders },
    ];
  },
  async redirects() {
    return [
      // Alias SEO amigable de la verificación pública.
      { source: "/verificar-certificado", destination: "/verificar", permanent: true },
      { source: "/verificar-certificado/:code", destination: "/verificar/:code", permanent: true },
    ];
  },
};

export default nextConfig;
