// Identidad comercial pública usada por la landing.
// Cambiar aquí cualquier dato corporativo de RISKS INTERNATIONAL.

export const BRAND = {
  shortName: "RISKS INTERNATIONAL",
  fullName: "Risks International S.A.S.",
  legalName: "RISKS INTERNATIONAL S.A.S.",
  /** Nombre comercial del programa / plataforma. */
  appName: "CIOC",
  /** Nombre completo del programa. */
  appLongName: "Certificado de Idoneidad como Oficial de Cumplimiento",
  tagline: "Certificación y acreditación profesional",
  slogan: "Trabajamos para facilitar decisiones seguras",
  claim: "Certifica tus competencias y demuestra tu conocimiento con respaldo, trazabilidad y verificación digital.",
  // Los activos de marca (logo, firma) se cargan dinámicamente desde
  // lib/brand-assets.ts → BD del suscriptor RISKS (subido en /panel/organizacion)
  // con fallback a /public/risks-logo.png. Nunca usamos un logo placeholder.
  description:
    "Plataforma digital para la certificación y acreditación de personas en compliance, riesgos, debida diligencia y prevención LA/FT — con certificados verificables por QR.",
  // Dominio comercial canónico (para canonicals/SEO/OG).
  domain: "okacreditado.com",
  appUrl: "https://www.okacreditado.com",
  contactEmail: "calidad@risksint.com",
  contactPhone: null as string | null,
  address: "Colombia",
  isoNorm: "ISO/IEC 17024",
  social: {
    linkedin: "https://www.linkedin.com/company/risks-international",
    instagram: null as string | null,
    facebook: null as string | null,
    twitter: null as string | null,
  },
};

// CTAs y rutas reutilizables.
export const CTAS = {
  certify: { href: "/registro", label: "Certifícate ahora" },
  certifications: { href: "/certificaciones", label: "Ver certificaciones disponibles" },
  verify: { href: "/verificar", label: "Verificar certificado" },
  login: { href: "/login", label: "Iniciar sesión" },
  register: { href: "/registro", label: "Crear mi cuenta" },
  contact: { href: "/contacto", label: "Solicitar información" },
};

// Catálogo público de certificaciones (para la landing y páginas de detalle).
// El "slug" mapea a /certificaciones/[slug]. La operación real (esquemas y
// exámenes) sigue cargada en BD; este catálogo es el escaparate comercial.
export interface PublicCertification {
  slug: string;
  name: string;
  shortName: string;
  category: "LA/FT" | "Compliance" | "Datos" | "Gestión";
  level: "Profesional" | "Especialista" | "Avanzado";
  modality: "Online";
  durationMin: number;
  validityMonths: number;
  audience: string;
  competencies: string[];
  syllabus: string[];
  requirements: string[];
  description: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  /** Precio subtotal (no incluye IVA), en COP. null si "Solicitar información". */
  priceCOP: number | null;
  /**
   * Estado comercial del programa:
   * - AVAILABLE: inscripción abierta inmediata.
   * - COMING_SOON: anunciado pero aún no abierto; CTA "Notificarme".
   * - ON_REQUEST: catálogo no público; CTA "Solicitar información".
   */
  status: "AVAILABLE" | "COMING_SOON" | "ON_REQUEST";
}

export const CERTIFICATIONS: PublicCertification[] = [
  {
    slug: "sarlaft",
    name: "Certificación Profesional Oficial de Cumplimiento SARLAFT — Supertransporte",
    shortName: "SARLAFT (Supertransporte)",
    category: "LA/FT",
    level: "Especialista",
    modality: "Online",
    durationMin: 90,
    validityMonths: 36,
    audience:
      "Oficiales de cumplimiento, líderes de riesgo y profesionales de empresas vigiladas por la Superintendencia de Transporte que requieran acreditar competencias en SARLAFT.",
    competencies: [
      "Marco normativo SARLAFT (Resolución 11268/2020 y modificaciones).",
      "Diseño e implementación del sistema de administración de riesgos LA/FT/FPADM.",
      "Conocimiento de contrapartes y monitoreo transaccional.",
      "Reporte de operaciones sospechosas y comunicación con la UIAF.",
      "Cultura de cumplimiento y gestión del riesgo reputacional.",
    ],
    syllabus: [
      "Fundamentos legales y normativos del SARLAFT.",
      "Etapas del sistema: identificación, medición, control y monitoreo.",
      "Debida diligencia ordinaria, intensificada y simplificada.",
      "Listas restrictivas, vinculantes y de control.",
      "Señales de alerta y tipologías del sector transporte.",
      "Reportes regulatorios y plazos.",
      "Régimen sancionatorio y responsabilidades.",
    ],
    requirements: [
      "Documento de identidad vigente.",
      "Soportes académicos o de experiencia (opcionales).",
      "Aceptación de política de tratamiento de datos.",
    ],
    description:
      "Certificación profesional dirigida a personas que ejercen como Oficial de Cumplimiento en empresas vigiladas por la Superintendencia de Transporte. Acredita competencias para diseñar, implementar y supervisar el SARLAFT con base en la normativa vigente colombiana.",
    metaTitle:
      "Certificación SARLAFT para Oficial de Cumplimiento — Supertransporte | RISKS INTERNATIONAL",
    metaDescription:
      "Certifica tus competencias como Oficial de Cumplimiento SARLAFT en el sector transporte con RISKS INTERNATIONAL. Evaluación digital, certificado verificable por QR, vigencia 3 años.",
    keywords: [
      "certificación SARLAFT",
      "oficial de cumplimiento SARLAFT",
      "SARLAFT Supertransporte",
      "certificación prevención LAFT transporte",
    ],
    priceCOP: 650000,
    status: "AVAILABLE",
  },
  {
    slug: "sagrilaft",
    name: "Certificación Profesional Oficial de Cumplimiento SAGRILAFT — Supersociedades",
    shortName: "SAGRILAFT (Supersociedades)",
    category: "LA/FT",
    level: "Especialista",
    modality: "Online",
    durationMin: 90,
    validityMonths: 36,
    audience:
      "Oficiales de cumplimiento de sociedades vigiladas por la Superintendencia de Sociedades obligadas a implementar el SAGRILAFT (Circular Básica Jurídica).",
    competencies: [
      "Marco normativo SAGRILAFT (Circular Básica Jurídica y Capítulo X).",
      "Diseño e implementación del sistema de autogestión del riesgo LA/FT.",
      "Debida diligencia de contrapartes y beneficiarios finales.",
      "Reportes a la UIAF y al Comité de Cumplimiento.",
      "Política y código de ética en prevención LA/FT.",
    ],
    syllabus: [
      "Marco normativo: Capítulo X y disposiciones aplicables.",
      "Estructura del SAGRILAFT y gobernanza.",
      "Conocimiento de contrapartes (KYC) y beneficiarios finales.",
      "Listas vinculantes, restrictivas y bases de datos especializadas.",
      "Monitoreo, señales de alerta y reportes.",
      "Capacitación y cultura organizacional de cumplimiento.",
    ],
    requirements: [
      "Documento de identidad vigente.",
      "Soportes académicos o de experiencia (opcionales).",
      "Aceptación de política de tratamiento de datos.",
    ],
    description:
      "Certificación profesional para Oficiales de Cumplimiento en sociedades vigiladas por Supersociedades. Acredita competencias técnicas y de criterio para administrar el riesgo de LA/FT bajo el SAGRILAFT.",
    metaTitle:
      "Certificación SAGRILAFT para Oficial de Cumplimiento — Supersociedades | RISKS INTERNATIONAL",
    metaDescription:
      "Acredita tus competencias en SAGRILAFT como Oficial de Cumplimiento con RISKS INTERNATIONAL. Evaluación online, certificado digital verificable por QR.",
    keywords: [
      "certificación SAGRILAFT",
      "oficial de cumplimiento SAGRILAFT",
      "SAGRILAFT Supersociedades",
      "Capítulo X SAGRILAFT",
    ],
    priceCOP: 950000,
    status: "COMING_SOON",
  },
  {
    slug: "siplaft",
    name: "Certificación Profesional SIPLAFT — Sector Transporte",
    shortName: "SIPLAFT (Sector Transporte)",
    category: "LA/FT",
    level: "Profesional",
    modality: "Online",
    durationMin: 75,
    validityMonths: 36,
    audience:
      "Profesionales y oficiales de cumplimiento de empresas obligadas a aplicar el Sistema Integral de Prevención de LA/FT en transporte.",
    competencies: [
      "Estructura del SIPLAFT y diferencias con SARLAFT/SAGRILAFT.",
      "Conocimiento de clientes, contrapartes y proveedores.",
      "Monitoreo de operaciones y umbrales de riesgo.",
      "Gestión de reportes y comunicación con autoridades.",
    ],
    syllabus: [
      "Origen y alcance del SIPLAFT.",
      "Etapas: identificación, medición, control y monitoreo.",
      "Procedimientos operativos por área del negocio de transporte.",
      "Reportes UIAF y trazabilidad documental.",
    ],
    requirements: [
      "Documento de identidad vigente.",
      "Soportes académicos o de experiencia (opcionales).",
      "Aceptación de política de tratamiento de datos.",
    ],
    description:
      "Certificación enfocada en profesionales del sector transporte que requieren acreditar competencias en el Sistema Integral de Prevención de LA/FT (SIPLAFT).",
    metaTitle:
      "Certificación SIPLAFT en el Sector Transporte | RISKS INTERNATIONAL",
    metaDescription:
      "Certifica tus competencias en SIPLAFT con RISKS INTERNATIONAL. Diseñada para profesionales y oficiales de cumplimiento del sector transporte. Certificado verificable digitalmente.",
    keywords: [
      "certificación SIPLAFT",
      "SIPLAFT sector transporte",
      "prevención LAFT transporte",
    ],
    priceCOP: null,
    status: "ON_REQUEST",
  },
  {
    slug: "oficial-cumplimiento",
    name: "Certificación Profesional Oficial de Cumplimiento",
    shortName: "Oficial de Cumplimiento",
    category: "Compliance",
    level: "Avanzado",
    modality: "Online",
    durationMin: 120,
    validityMonths: 36,
    audience:
      "Profesionales que ejercen o aspiran a ejercer como Oficiales de Cumplimiento en cualquier sector regulado en Colombia.",
    competencies: [
      "Marco general de cumplimiento normativo en Colombia.",
      "Diseño e implementación de sistemas de cumplimiento (SARLAFT, SAGRILAFT, PTEE, SIPLAFT).",
      "Gobernanza, ética e integridad corporativa.",
      "Debida diligencia, KYC y conocimiento de contrapartes.",
      "Relación con autoridades, reportes regulatorios y régimen sancionatorio.",
    ],
    syllabus: [
      "Cumplimiento normativo: panorama general y marcos sectoriales.",
      "Sistemas de prevención LA/FT, soborno y corrupción.",
      "Programa de transparencia y ética empresarial (PTEE).",
      "Gestión integral del riesgo de cumplimiento.",
      "Comité de cumplimiento, reportes y trazabilidad.",
    ],
    requirements: [
      "Documento de identidad vigente.",
      "Hoja de vida con experiencia o formación relacionada (opcional).",
      "Aceptación de política de tratamiento de datos.",
    ],
    description:
      "Certificación profesional integral para Oficiales de Cumplimiento. Acredita competencias transversales en SARLAFT, SAGRILAFT, PTEE, debida diligencia y gestión integral del cumplimiento.",
    metaTitle:
      "Certificación Profesional Oficial de Cumplimiento | RISKS INTERNATIONAL",
    metaDescription:
      "Acredita tus competencias como Oficial de Cumplimiento integral con RISKS INTERNATIONAL. Evaluación digital y certificado verificable. Vigencia 3 años.",
    keywords: [
      "certificación oficial de cumplimiento",
      "compliance officer",
      "certificación compliance Colombia",
      "PTEE oficial de cumplimiento",
    ],
    priceCOP: null,
    status: "ON_REQUEST",
  },
];

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

/**
 * Slugs de certificaciones marcadas como "Próximamente" — la inscripción
 * pública queda bloqueada hasta que el organismo certificador apruebe la
 * apertura. Manejado por lib/brand.ts para mantener una única fuente de verdad
 * usable por UI y por server actions.
 */
export const COMING_SOON_SLUGS = new Set(
  CERTIFICATIONS.filter((c) => c.status === "COMING_SOON").map((c) => c.slug),
);

/**
 * Determina si un esquema (CertificationScheme.name proveniente de BD) está en
 * estado "Próximamente". Hace matching contra el nombre del programa.
 */
export function isSchemeComingSoon(schemeName: string | null | undefined): boolean {
  if (!schemeName) return false;
  const upper = schemeName.toUpperCase();
  // Igual lista de slugs marcados COMING_SOON arriba, pero matched por keyword
  // del programa (más robusto contra cambios menores de nombre).
  if (COMING_SOON_SLUGS.has("sagrilaft") && /SAGRILAFT/.test(upper)) return true;
  if (COMING_SOON_SLUGS.has("siplaft") && /SIPLAFT/.test(upper)) return true;
  if (COMING_SOON_SLUGS.has("oficial-cumplimiento") && /OFICIAL DE CUMPLIMIENTO(?!.*(SARLAFT|SAGRILAFT|SIPLAFT))/.test(upper)) return true;
  return false;
}
