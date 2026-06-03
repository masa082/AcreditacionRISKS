import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Permitimos indexar el público (landing, certificaciones, verificación)
      // y bloqueamos rutas privadas y administrativas.
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/panel",
          "/portal",
          "/admin",
          "/login",
          "/recuperar",
          "/restablecer",
          "/certificado/",
        ],
      },
    ],
    sitemap: `${BRAND.appUrl}/sitemap.xml`,
    host: BRAND.appUrl,
  };
}
