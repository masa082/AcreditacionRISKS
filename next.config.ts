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

/**
 * Para rutas que sirven archivos del propio organismo (PDFs de
 * certificados, soportes de pago, miniaturas de documentos, etc.)
 * necesitamos permitir embebido SOLO desde nuestros dominios.
 *
 * Por qué CSP frame-ancestors y no solo X-Frame-Options SAMEORIGIN:
 *
 *   El sitio se sirve en producción desde DOS hosts (apex + www):
 *     - https://okacreditado.com
 *     - https://www.okacreditado.com
 *   Vercel redirige automáticamente las requests de iframes entre
 *   ellos. Si el padre está en apex y el iframe carga una URL
 *   relativa, Vercel devuelve 308 a www. La respuesta viene de www
 *   y el padre está en apex — para X-Frame-Options:SAMEORIGIN son
 *   orígenes distintos → el navegador muestra "rechazó la conexión".
 *
 *   CSP frame-ancestors permite enumerar varios orígenes válidos,
 *   y el navegador lo evalúa después del redirect. Listamos los dos
 *   orígenes del organismo + 'self' (cubre el origen real del
 *   archivo). Bloquea todo lo demás (defensa contra clickjacking).
 *
 *   X-Frame-Options se deja con valor "SAMEORIGIN" como fallback
 *   para clientes muy antiguos que no entienden CSP; los modernos
 *   usan CSP que es estrictamente más expresivo.
 */
const FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://okacreditado.com https://www.okacreditado.com";

const filesHeaders = [
  ...securityHeaders.map((h) =>
    h.key === "X-Frame-Options" ? { ...h, value: "SAMEORIGIN" } : h,
  ),
  { key: "Content-Security-Policy", value: FRAME_ANCESTORS_CSP },
];

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
      // iframe same-origin para las miniaturas en /panel/candidatos y
      // la vista previa del certificado en /portal/certificados.
      { source: "/api/files/:path*", headers: filesHeaders },
      { source: "/api/payments/:path*", headers: filesHeaders },
      { source: "/api/docs-file/:path*", headers: filesHeaders },
      { source: "/api/certificate/:path*", headers: filesHeaders },
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
