import type { MetadataRoute } from "next";
import { CERTIFICATIONS, BRAND } from "@/lib/brand";

const STATIC_ROUTES: { path: string; priority: number; changefreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/certificaciones", priority: 0.9, changefreq: "monthly" },
  { path: "/preguntas-frecuentes", priority: 0.7, changefreq: "monthly" },
  { path: "/verificar", priority: 0.8, changefreq: "monthly" },
  { path: "/contacto", priority: 0.7, changefreq: "monthly" },
  { path: "/registro", priority: 0.7, changefreq: "monthly" },
  { path: "/login", priority: 0.4, changefreq: "yearly" },
  { path: "/terminos", priority: 0.3, changefreq: "yearly" },
  { path: "/privacidad", priority: 0.3, changefreq: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.appUrl;
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changefreq,
    priority: r.priority,
  }));
  const certEntries: MetadataRoute.Sitemap = CERTIFICATIONS.map((c) => ({
    url: `${base}/certificaciones/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [...staticEntries, ...certEntries];
}
