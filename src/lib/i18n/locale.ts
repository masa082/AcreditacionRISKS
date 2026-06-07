/**
 * Sistema mínimo de internacionalización (i18n) — sin librería externa.
 *
 * Decisiones de diseño:
 *  - Se guarda el idioma en cookie `app-locale` para que sobreviva al
 *    cierre del navegador. La detección server-side lee esa cookie en
 *    `getServerLocale()` antes de renderizar cualquier página.
 *  - Tres idiomas soportados de salida: ES, EN, PT. Default ES.
 *  - El diccionario está tipado: una key faltante en un idioma cae al
 *    string de ES (fallback) — nunca se rompe la UI.
 *  - Pensado para crecer: nuevas keys se agregan al objeto DICTIONARY
 *    y queda automáticamente disponible para todos los componentes.
 *
 * Si en el futuro se necesita ICU MessageFormat (plurales, géneros,
 * variables interpoladas complejas), migrar a `next-intl`.
 */

export type Locale = "es" | "en" | "pt";

export const LOCALES: Locale[] = ["es", "en", "pt"];

export const LOCALE_LABELS: Record<Locale, { label: string; native: string; flag: string }> = {
  es: { label: "Español", native: "Español", flag: "🇪🇸" },
  en: { label: "Inglés", native: "English", flag: "🇺🇸" },
  pt: { label: "Portugués", native: "Português", flag: "🇧🇷" },
};

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "app-locale";

export function isLocale(s: string): s is Locale {
  return (LOCALES as string[]).includes(s);
}

// ─────────── Diccionario ───────────
// Estructura plana key → { es, en, pt }.
// Agregar nuevas keys: agregue una propiedad y traduzca a los 3 idiomas.

type Dict = Record<string, { es: string; en: string; pt: string }>;

const DICTIONARY: Dict = {
  // Landing — hero
  "hero.eyebrow": {
    es: "Organismo de Certificación de Personas",
    en: "Person Certification Body",
    pt: "Organismo de Certificação de Pessoas",
  },
  "hero.h1.1": {
    es: "Usted ya sabe hacerlo.",
    en: "You already know how to do it.",
    pt: "Você já sabe como fazer.",
  },
  "hero.h1.2": {
    es: "Solo falta el papel que lo demuestre en serio.",
    en: "You just need the document that proves it seriously.",
    pt: "Só falta o documento que comprove com seriedade.",
  },
  "hero.subtitle": {
    es: "Una certificación profesional emitida bajo ISO/IEC 17024, con examen vigilado, QR público y firma autorizada.",
    en: "A professional certification issued under ISO/IEC 17024, with proctored exam, public QR and authorized signature.",
    pt: "Uma certificação profissional emitida sob a ISO/IEC 17024, com prova fiscalizada, QR público e assinatura autorizada.",
  },
  "cta.start": {
    es: "Iniciar mi certificación",
    en: "Start my certification",
    pt: "Iniciar minha certificação",
  },
  "cta.viewCerts": {
    es: "Ver certificaciones",
    en: "View certifications",
    pt: "Ver certificações",
  },
  "cta.verify": {
    es: "Verificar un certificado",
    en: "Verify a certificate",
    pt: "Verificar um certificado",
  },
  // Nav
  "nav.login": { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" },
  "nav.register": { es: "Crear cuenta", en: "Create account", pt: "Criar conta" },
  "nav.certifications": { es: "Certificaciones", en: "Certifications", pt: "Certificações" },
  "nav.verify": { es: "Verificar", en: "Verify", pt: "Verificar" },
  "nav.contact": { es: "Contacto", en: "Contact", pt: "Contato" },
  // Registro
  "registro.title": { es: "Cree su cuenta de candidato", en: "Create your candidate account", pt: "Crie sua conta de candidato" },
  "registro.subtitle": {
    es: "Regístrese para inscribirse en procesos de evaluación y certificación de personas.",
    en: "Register to enroll in person evaluation and certification processes.",
    pt: "Cadastre-se para participar de processos de avaliação e certificação de pessoas.",
  },
  "registro.sec.personal": { es: "Datos personales", en: "Personal data", pt: "Dados pessoais" },
  "registro.sec.location": { es: "Ubicación", en: "Location", pt: "Localização" },
  "registro.sec.contact": { es: "Contacto", en: "Contact", pt: "Contato" },
  "registro.sec.account": { es: "Acceso a su cuenta", en: "Account access", pt: "Acesso à sua conta" },
  "registro.firstName": { es: "Nombres", en: "First names", pt: "Nomes" },
  "registro.lastName": { es: "Apellidos", en: "Last names", pt: "Sobrenomes" },
  "registro.documentType": { es: "Tipo de documento", en: "Document type", pt: "Tipo de documento" },
  "registro.documentNumber": { es: "Número de documento", en: "Document number", pt: "Número do documento" },
  "registro.email": { es: "Correo electrónico", en: "Email", pt: "E-mail" },
  "registro.phone": { es: "Teléfono", en: "Phone", pt: "Telefone" },
  "registro.password": { es: "Contraseña", en: "Password", pt: "Senha" },
  "registro.passwordConfirm": { es: "Confirmar contraseña", en: "Confirm password", pt: "Confirmar senha" },
  "registro.passwordHint": { es: "Mínimo 8 caracteres.", en: "Minimum 8 characters.", pt: "Mínimo 8 caracteres." },
  "registro.submit": { es: "Crear cuenta de candidato →", en: "Create candidate account →", pt: "Criar conta de candidato →" },
  "registro.haveAccount": { es: "← Ya tengo cuenta", en: "← I already have an account", pt: "← Já tenho conta" },
  // Common
  "common.required": { es: "obligatorio", en: "required", pt: "obrigatório" },
  "common.optional": { es: "opcional", en: "optional", pt: "opcional" },
  "common.country": { es: "País", en: "Country", pt: "País" },
  "common.state": { es: "Departamento / Estado", en: "State / Province", pt: "Estado / Província" },
  "common.city": { es: "Municipio / Ciudad", en: "City / Municipality", pt: "Município / Cidade" },
  "common.address": { es: "Dirección", en: "Address", pt: "Endereço" },
};

/** Traduce una key al idioma indicado. Cae a ES si la combinación no existe. */
export function t(key: keyof typeof DICTIONARY | string, locale: Locale = DEFAULT_LOCALE): string {
  const entry = DICTIONARY[key];
  if (!entry) return key;
  return entry[locale] ?? entry.es ?? key;
}

/** Helper: devuelve una función `t` ya bindeada al locale. Útil server-side. */
export function tBinder(locale: Locale): (k: string) => string {
  return (k) => t(k, locale);
}
