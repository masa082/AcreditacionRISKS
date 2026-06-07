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

  // Registro — etiquetas extendidas del formulario
  "registro.org": { es: "Entidad certificadora", en: "Certifying body", pt: "Entidade certificadora" },
  "registro.org.hint": {
    es: "Organización ante la cual se certificará.",
    en: "Organization that will issue your certification.",
    pt: "Organização perante a qual você será certificado.",
  },
  "registro.cert": { es: "Certificación de interés", en: "Certification of interest", pt: "Certificação de interesse" },
  "registro.cert.hint": {
    es: "Su cuenta queda registrada para iniciar la inscripción a este programa.",
    en: "Your account is registered to start enrollment in this program.",
    pt: "Sua conta é registrada para iniciar a inscrição neste programa.",
  },
  "registro.cert.comingSoon": {
    es: "Lanzamiento próximo · podrá inscribirse cuando se habilite.",
    en: "Coming soon · enrollment will open when available.",
    pt: "Em breve · você poderá se inscrever quando estiver disponível.",
  },
  "registro.status.available": { es: "Disponible", en: "Available", pt: "Disponível" },
  "registro.status.comingSoon": { es: "Próximamente", en: "Coming soon", pt: "Em breve" },
  "registro.status.onRequest": { es: "Solicitar info", en: "Request info", pt: "Solicitar info" },

  "registro.sec.personal.desc": {
    es: "Datos básicos del titular. Aparecerán en su Hoja de Vida y en el certificado emitido.",
    en: "Basic holder data. Will appear on your CV and on the issued certificate.",
    pt: "Dados básicos do titular. Aparecerão em seu currículo e no certificado emitido.",
  },
  "registro.sec.location.desc": {
    es: "Su lugar de residencia. Si está en Colombia, el departamento se completa automáticamente al elegir el municipio.",
    en: "Your place of residence. If you are in Colombia, the state autocompletes when you pick the city.",
    pt: "Seu local de residência. Se estiver na Colômbia, o departamento é preenchido automaticamente ao escolher o município.",
  },
  "registro.sec.contact.desc": {
    es: "Por aquí le enviaremos su comprobante de inscripción, el resultado de la evaluación y su certificado emitido.",
    en: "We will send you here your enrollment receipt, evaluation result and issued certificate.",
    pt: "Por aqui enviaremos seu comprovante de inscrição, o resultado da avaliação e seu certificado emitido.",
  },
  "registro.sec.account.desc": {
    es: "Cree una contraseña fuerte. La usará para iniciar sesión en su portal de candidato.",
    en: "Create a strong password. You will use it to sign in to your candidate portal.",
    pt: "Crie uma senha forte. Você a usará para fazer login no seu portal de candidato.",
  },

  "registro.doc.cc": { es: "Cédula de ciudadanía", en: "National ID (CC)", pt: "Documento de identidade (CC)" },
  "registro.doc.ce": { es: "Cédula de extranjería", en: "Foreigner ID (CE)", pt: "Identidade de estrangeiro (CE)" },
  "registro.doc.passport": { es: "Pasaporte", en: "Passport", pt: "Passaporte" },
  "registro.doc.ti": { es: "Tarjeta de identidad", en: "Identity card (TI)", pt: "Carteira de identidade (TI)" },
  "registro.doc.nit": { es: "NIT", en: "Tax ID (NIT)", pt: "NIT" },

  "registro.duplicate.title.doc": {
    es: "Esa identificación ya tiene una cuenta creada",
    en: "That ID already has an account",
    pt: "Esse documento já possui uma conta",
  },
  "registro.duplicate.title.email": {
    es: "Ese correo ya tiene una cuenta creada",
    en: "That email already has an account",
    pt: "Esse e-mail já possui uma conta",
  },
  "registro.duplicate.cta.reset": { es: "Restablecer contraseña →", en: "Reset password →", pt: "Redefinir senha →" },
  "registro.duplicate.cta.login": { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" },
  "registro.duplicate.cta.admin": {
    es: "Solicitar actualización al administrador",
    en: "Request update from administrator",
    pt: "Solicitar atualização ao administrador",
  },

  "registro.success.title": { es: "Revise su correo", en: "Check your email", pt: "Confira seu e-mail" },
  "registro.success.body": {
    es: "Le enviamos un enlace para validar su cuenta. En este entorno de demostración no hay servidor de correo, por lo que puede activar su cuenta directamente con el siguiente botón.",
    en: "We sent you a link to verify your account. In this demo environment there is no email server, so you can activate your account directly with the button below.",
    pt: "Enviamos um link para validar sua conta. Neste ambiente de demonstração não há servidor de e-mail, então você pode ativar sua conta diretamente com o botão abaixo.",
  },
  "registro.success.activate": { es: "Activar mi cuenta ahora", en: "Activate my account now", pt: "Ativar minha conta agora" },
  "registro.submit.pending": { es: "Creando cuenta…", en: "Creating account…", pt: "Criando conta…" },

  // Portal — wizard y proceso
  "portal.wizard.welcome": { es: "Bienvenido", en: "Welcome", pt: "Bem-vindo" },
  "portal.wizard.title": {
    es: "Comencemos su proceso de certificación",
    en: "Let's begin your certification process",
    pt: "Vamos começar seu processo de certificação",
  },
  "portal.wizard.subtitle": {
    es: "Le guiamos paso a paso. Su próximo paso accionable está resaltado abajo.",
    en: "We guide you step by step. Your next actionable step is highlighted below.",
    pt: "Nós o guiamos passo a passo. Seu próximo passo acionável está destacado abaixo.",
  },
  "portal.wizard.cta.start": {
    es: "🚀 Ver evaluaciones e inscribirme",
    en: "🚀 View evaluations and enroll",
    pt: "🚀 Ver avaliações e inscrever-me",
  },
  "portal.wizard.cta.continue": { es: "Continuar mi proceso →", en: "Continue my process →", pt: "Continuar meu processo →" },

  "process.title": { es: "Su proceso en 4 pasos simples", en: "Your process in 4 simple steps", pt: "Seu processo em 4 passos simples" },
  "process.subtitle": {
    es: "Así avanza desde su registro hasta el certificado verificable.",
    en: "Here is how you go from registration to a verifiable certificate.",
    pt: "Assim você avança do registro até o certificado verificável.",
  },
  "process.eyebrow": { es: "Camino de certificación", en: "Certification path", pt: "Caminho de certificação" },
  "process.step": { es: "Paso", en: "Step", pt: "Passo" },
  "process.estimate": {
    es: "Tiempo total estimado: ~1 semana hábil desde el registro hasta recibir el diploma.",
    en: "Estimated total time: ~1 business week from registration to diploma.",
    pt: "Tempo total estimado: ~1 semana útil do registro até receber o diploma.",
  },
  "process.s1.title": { es: "Registro", en: "Registration", pt: "Registro" },
  "process.s1.desc": {
    es: "Cree su cuenta de candidato con sus datos personales y la autorización de tratamiento de datos.",
    en: "Create your candidate account with your personal data and data-processing consent.",
    pt: "Crie sua conta de candidato com seus dados pessoais e a autorização de tratamento de dados.",
  },
  "process.s2.title": { es: "Documentos + pago", en: "Documents + payment", pt: "Documentos + pagamento" },
  "process.s2.desc": {
    es: "Cargue su hoja de vida, cédula y foto, y pague la inscripción (online o por consignación).",
    en: "Upload your CV, ID and photo, and pay the enrollment fee (online or bank transfer).",
    pt: "Envie seu currículo, documento e foto, e pague a inscrição (online ou por transferência).",
  },
  "process.s3.title": { es: "Evaluación de idoneidad", en: "Competence evaluation", pt: "Avaliação de competência" },
  "process.s3.desc": {
    es: "Agende su prueba y preséntela en línea con monitoreo. Examen teórico + caso práctico.",
    en: "Schedule your test and take it online under supervision. Theory exam + practical case.",
    pt: "Agende sua prova e realize online com monitoramento. Prova teórica + caso prático.",
  },
  "process.s4.title": { es: "Calificación + certificado", en: "Grading + certificate", pt: "Aprovação + certificado" },
  "process.s4.desc": {
    es: "El comité revisa su historia laboral y emite su certificado verificable por QR público.",
    en: "The committee reviews your record and issues your QR-verifiable certificate.",
    pt: "O comitê revisa seu histórico e emite seu certificado verificável por QR público.",
  },

  // Landing — hero ampliado
  "land.hero.note": {
    es: "↘ su próximo aumento empieza aquí",
    en: "↘ your next raise starts here",
    pt: "↘ seu próximo aumento começa aqui",
  },
  "land.hero.eyebrow": {
    es: "Organismo de Certificación de Personas",
    en: "Person Certification Body",
    pt: "Organismo de Certificação de Pessoas",
  },
  "land.hero.title.1": { es: "Conviértase en", en: "Become a", pt: "Torne-se um" },
  "land.hero.title.2": { es: "Profesional Certificado", en: "Certified Professional", pt: "Profissional Certificado" },
  "land.hero.title.3": {
    es: "y deje de competir con quien no lo está.",
    en: "and stop competing against those who aren't.",
    pt: "e pare de competir com quem não é.",
  },
  "land.hero.body": {
    es: "Una credencial bajo ISO/IEC 17024 en SARLAFT, SAGRILAFT y debida diligencia — emitida con examen vigilado, QR público y firma autorizada.",
    en: "A credential under ISO/IEC 17024 in AML, sanctions and due diligence — issued with a proctored exam, public QR and authorized signature.",
    pt: "Uma credencial sob a ISO/IEC 17024 em PLD, sanções e diligência prévia — emitida com prova fiscalizada, QR público e assinatura autorizada.",
  },
  "land.hero.cta.primary": { es: "Empezar mi certificación", en: "Start my certification", pt: "Iniciar minha certificação" },
  "land.hero.cta.secondary": { es: "Ver certificaciones", en: "View certifications", pt: "Ver certificações" },
  "land.hero.cta.verify": { es: "Verificar un certificado", en: "Verify a certificate", pt: "Verificar um certificado" },
  "land.hero.disclaimer": {
    es: "Una semana hábil entre el clic y el diploma en su correo · sin compromisos hasta que pague · 100 % online",
    en: "One business week between the click and the diploma in your inbox · no commitments until you pay · 100% online",
    pt: "Uma semana útil entre o clique e o diploma no seu e-mail · sem compromissos até pagar · 100% online",
  },
  "land.hero.feat.qr": { es: "Verificable por terceros", en: "Verifiable by third parties", pt: "Verificável por terceiros" },
  "land.hero.feat.proctor": { es: "Examen vigilado y trazable", en: "Proctored, traceable exam", pt: "Prova fiscalizada e rastreável" },
  "land.hero.feat.backing": { es: "Respaldo institucional", en: "Institutional backing", pt: "Respaldo institucional" },
  "land.hero.feat.recert": { es: "Recertificación asistida", en: "Assisted recertification", pt: "Recertificação assistida" },
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
