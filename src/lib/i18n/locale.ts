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

  // Nav extendido (landing header)
  "nav.home": { es: "Inicio", en: "Home", pt: "Início" },
  "nav.benefits": { es: "Beneficios", en: "Benefits", pt: "Benefícios" },
  "nav.process": { es: "Proceso", en: "Process", pt: "Processo" },
  "nav.verify.long": { es: "Verificar certificado", en: "Verify certificate", pt: "Verificar certificado" },
  "nav.referrals": { es: "Refiere y gana", en: "Refer and earn", pt: "Indique e ganhe" },
  "nav.faq": { es: "FAQ", en: "FAQ", pt: "FAQ" },

  // Hero micro form
  "micro.success.title": {
    es: "¡Gracias! Te contactaremos en breve.",
    en: "Thanks! We'll be in touch shortly.",
    pt: "Obrigado! Entraremos em contato em breve.",
  },
  "micro.success.body.before": {
    es: "Mientras tanto, ",
    en: "Meanwhile, ",
    pt: "Enquanto isso, ",
  },
  "micro.success.body.after": {
    es: " y avanza con tu certificación.",
    en: " and move forward with your certification.",
    pt: " e avance com sua certificação.",
  },
  "micro.success.link": {
    es: "crea tu cuenta",
    en: "create your account",
    pt: "crie sua conta",
  },
  "micro.eyebrow": {
    es: "Recibe información en menos de 60 segundos",
    en: "Get info in under 60 seconds",
    pt: "Receba informações em menos de 60 segundos",
  },
  "micro.fullName": { es: "Nombre y apellido", en: "Full name", pt: "Nome completo" },
  "micro.email": { es: "Correo electrónico", en: "Email", pt: "E-mail" },
  "micro.consent.before": {
    es: "Acepto la ",
    en: "I accept the ",
    pt: "Aceito a ",
  },
  "micro.consent.policy": {
    es: "política de tratamiento de datos",
    en: "data processing policy",
    pt: "política de tratamento de dados",
  },
  "micro.consent.after": {
    es: " y autorizo el contacto comercial.",
    en: " and authorize commercial contact.",
    pt: " e autorizo o contato comercial.",
  },
  "micro.sending": { es: "Enviando…", en: "Sending…", pt: "Enviando…" },
  "micro.cta": { es: "Recibir información →", en: "Get information →", pt: "Receber informações →" },
  "micro.fineprint": {
    es: "Sin spam · 100 % confidencial · ISO/IEC 17024",
    en: "No spam · 100% confidential · ISO/IEC 17024",
    pt: "Sem spam · 100% confidencial · ISO/IEC 17024",
  },

  // Trust metrics (labels)
  "trust.professionals": { es: "profesionales certificados", en: "certified professionals", pt: "profissionais certificados" },
  "trust.companies": { es: "empresas confían en RISKS", en: "companies trust RISKS", pt: "empresas confiam na RISKS" },
  "trust.avgScore": { es: "puntaje promedio de aprobación", en: "average passing score", pt: "pontuação média de aprovação" },
  "trust.daysToIssue": { es: "días hábiles para emitir el certificado", en: "business days to issue the certificate", pt: "dias úteis para emitir o certificado" },

  // Land — trust / authority section
  "land.trust.eyebrow": { es: "Lo que respalda este diploma", en: "What backs this diploma", pt: "O que respalda este diploma" },
  "land.trust.title.1": { es: "Más de una década", en: "More than a decade", pt: "Mais de uma década" },
  "land.trust.title.2": {
    es: "sosteniendo sistemas de prevención y cumplimiento en empresas reales",
    en: "sustaining prevention and compliance systems in real companies",
    pt: "sustentando sistemas de prevenção e conformidade em empresas reais",
  },
  "land.trust.body": {
    es: "No somos una academia que decidió un día emitir certificados. Llevamos doce años operando SARLAFT, SAGRILAFT y debida diligencia desde adentro — esa experiencia es la que se traduce en este programa.",
    en: "We're not an academy that one day decided to issue certificates. We've spent twelve years running AML, sanctions and due diligence programs from the inside — that experience is what shows up in this program.",
    pt: "Não somos uma academia que um dia decidiu emitir certificados. Passamos doze anos operando PLD, sanções e diligência prévia por dentro — essa experiência é o que se traduz neste programa.",
  },

  // Land — personas
  "land.personas.eyebrow": { es: "¿Es esto para usted?", en: "Is this for you?", pt: "Isto é para você?" },
  "land.personas.title.1": { es: "Hecho para", en: "Built for", pt: "Feito para" },
  "land.personas.title.2": {
    es: "cuatro perfiles que ya conocemos bien",
    en: "four profiles we already know well",
    pt: "quatro perfis que já conhecemos bem",
  },
  "land.personas.body": {
    es: "Llevamos doce años trabajando con estos cargos. Sabemos qué piden los jefes, qué filtran los reclutadores y qué pesa en una negociación salarial. Por eso esto está hecho como está.",
    en: "We've spent twelve years working with these roles. We know what bosses ask for, what recruiters filter on, and what carries weight in a salary negotiation. That's why this is built the way it is.",
    pt: "Passamos doze anos trabalhando com esses cargos. Sabemos o que os chefes pedem, o que os recrutadores filtram e o que pesa numa negociação salarial. Por isso isto é feito do jeito que é.",
  },
  "land.personas.foot.before": {
    es: "¿No se reconoce exactamente en ninguno? Probablemente sí encaja — ",
    en: "Don't see yourself exactly in any of them? You probably still fit — ",
    pt: "Não se reconhece exatamente em nenhum? Provavelmente ainda se encaixa — ",
  },
  "land.personas.foot.link": { es: "escríbanos y vemos", en: "write to us and we'll see", pt: "escreva-nos e vemos" },
  "land.personas.foot.after": {
    es: " qué certificación se ajusta a su rol.",
    en: " which certification fits your role.",
    pt: " qual certificação se ajusta ao seu cargo.",
  },

  // Personas
  "persona.officer.who": { es: "Oficial de Cumplimiento", en: "Compliance Officer", pt: "Oficial de Conformidade" },
  "persona.officer.pain": {
    es: "Tu jefe te pide soporte formal antes de la próxima visita de la Súper.",
    en: "Your boss wants formal proof before the next regulator visit.",
    pt: "Seu chefe pede comprovação formal antes da próxima visita do regulador.",
  },
  "persona.officer.promise": {
    es: "Llegas con el certificado bajo norma internacional. Pregunta cerrada.",
    en: "You arrive with the certificate under an international standard. Question closed.",
    pt: "Você chega com o certificado sob norma internacional. Pergunta encerrada.",
  },
  "persona.analyst.who": { es: "Analista que quiere subir", en: "Analyst aiming higher", pt: "Analista que quer subir" },
  "persona.analyst.pain": {
    es: "Sabes hacerlo, pero en el CV se ve igual al de los demás analistas.",
    en: "You know how to do it, but on paper your CV looks like every other analyst's.",
    pt: "Você sabe fazer, mas no currículo parece igual ao dos outros analistas.",
  },
  "persona.analyst.promise": {
    es: "Una credencial verificable te pone arriba de la pila en RR.HH.",
    en: "A verifiable credential puts you at the top of the HR pile.",
    pt: "Uma credencial verificável coloca você no topo da pilha do RH.",
  },
  "persona.consultant.who": { es: "Consultor o consultora", en: "Consultant", pt: "Consultor(a)" },
  "persona.consultant.pain": {
    es: "Cada cliente nuevo te pide demostrar credibilidad desde cero.",
    en: "Every new client asks you to prove credibility from scratch.",
    pt: "Cada novo cliente pede que você comprove credibilidade do zero.",
  },
  "persona.consultant.promise": {
    es: "El QR cierra la conversación de confianza antes de la primera reunión.",
    en: "The QR closes the trust conversation before the first meeting.",
    pt: "O QR encerra a conversa de confiança antes da primeira reunião.",
  },
  "persona.transition.who": { es: "Profesional en transición", en: "Professional in transition", pt: "Profissional em transição" },
  "persona.transition.pain": {
    es: "Estás cambiando de sector — necesitas una credencial que abra puertas hoy.",
    en: "You're switching sectors — you need a credential that opens doors today.",
    pt: "Você está mudando de setor — precisa de uma credencial que abra portas hoje.",
  },
  "persona.transition.promise": {
    es: "Una semana hábil y ya tienes algo que mostrar al empleador objetivo.",
    en: "One business week and you've got something to show the employer you're targeting.",
    pt: "Uma semana útil e você já tem algo para mostrar ao empregador-alvo.",
  },

  // Benefits
  "benefit.salary.title": {
    es: "Negocie su próximo salario con argumentos",
    en: "Negotiate your next salary with real arguments",
    pt: "Negocie seu próximo salário com argumentos",
  },
  "benefit.salary.desc": {
    es: "Llegar a la revisión con un certificado bajo ISO/IEC 17024 no es lo mismo que llegar con buena voluntad. Tiene cómo sustentar lo que pide.",
    en: "Walking into your review with an ISO/IEC 17024 credential isn't the same as walking in on goodwill. You have ground to stand on.",
    pt: "Chegar à revisão com um certificado sob ISO/IEC 17024 não é o mesmo que chegar com boa vontade. Você tem como sustentar o que pede.",
  },
  "benefit.salary.callout": { es: "Salario", en: "Salary", pt: "Salário" },
  "benefit.shortlist.title": {
    es: "Quede en la lista corta de las vacantes top",
    en: "Land on the shortlist for top openings",
    pt: "Entre na lista curta das vagas top",
  },
  "benefit.shortlist.desc": {
    es: "Las empresas vigiladas necesitan oficiales con competencias demostrables. Reclutadores filtran por credencial — usted ya está del lado correcto del filtro.",
    en: "Regulated firms need officers with demonstrable competencies. Recruiters filter by credential — you're already on the right side of the filter.",
    pt: "Empresas reguladas precisam de oficiais com competências comprováveis. Recrutadores filtram por credencial — você já está do lado certo do filtro.",
  },
  "benefit.shortlist.callout": { es: "Empleabilidad", en: "Employability", pt: "Empregabilidade" },
  "benefit.promotion.title": {
    es: "Salte al siguiente cargo más rápido",
    en: "Jump to the next role faster",
    pt: "Salte para o próximo cargo mais rápido",
  },
  "benefit.promotion.desc": {
    es: "De analista a oficial. De oficial a líder. La credencial es el empujón que faltaba para que su jefe — o el de la otra empresa — diga sí.",
    en: "From analyst to officer. From officer to lead. The credential is the nudge that gets your boss — or the next company's — to say yes.",
    pt: "De analista a oficial. De oficial a líder. A credencial é o empurrão que faltava para seu chefe — ou o da outra empresa — dizer sim.",
  },
  "benefit.promotion.callout": { es: "Promoción", en: "Promotion", pt: "Promoção" },
  "benefit.linkedin.title": {
    es: "Su LinkedIn deja de ser uno más",
    en: "Your LinkedIn stops being just another profile",
    pt: "Seu LinkedIn deixa de ser mais um",
  },
  "benefit.linkedin.desc": {
    es: "Sube el diploma con QR público. Cualquier reclutador escanea, valida en 10 segundos y le llega un mensaje. Pasa de buscar trabajo a recibir ofertas.",
    en: "Post the diploma with the public QR. Any recruiter scans, verifies in 10 seconds, and a message lands in your inbox. You stop hunting and start receiving offers.",
    pt: "Publique o diploma com QR público. Qualquer recrutador escaneia, valida em 10 segundos e uma mensagem chega. Você deixa de procurar emprego e passa a receber ofertas.",
  },
  "benefit.linkedin.callout": { es: "Visibilidad", en: "Visibility", pt: "Visibilidade" },
  "benefit.recognition.title": {
    es: "Demuestre el conocimiento que ya tiene",
    en: "Prove the knowledge you already have",
    pt: "Comprove o conhecimento que você já tem",
  },
  "benefit.recognition.desc": {
    es: "Lleva años haciendo el trabajo bien. Ahora hay un documento formal — emitido bajo norma internacional — que respalda lo que usted ya sabe.",
    en: "You've been doing the job well for years. Now there's a formal document — issued under an international standard — that backs what you already know.",
    pt: "Você faz o trabalho bem há anos. Agora existe um documento formal — emitido sob norma internacional — que respalda o que você já sabe.",
  },
  "benefit.recognition.callout": { es: "Reconocimiento", en: "Recognition", pt: "Reconhecimento" },
  "benefit.continuity.title": {
    es: "Crezca con respaldo, no con suerte",
    en: "Grow with backing, not luck",
    pt: "Cresça com respaldo, não com sorte",
  },
  "benefit.continuity.desc": {
    es: "Recordatorios de vencimiento, recertificación con un clic, histórico permanente. Su carrera no se queda colgada del azar — queda registrada en una credencial viva.",
    en: "Expiry reminders, one-click recertification, permanent history. Your career doesn't hang on luck — it's logged in a living credential.",
    pt: "Lembretes de vencimento, recertificação com um clique, histórico permanente. Sua carreira não fica na sorte — fica registrada numa credencial viva.",
  },
  "benefit.continuity.callout": { es: "Continuidad", en: "Continuity", pt: "Continuidade" },

  "land.benefits.eyebrow": {
    es: "Lo que cambia en su carrera el día que se certifica",
    en: "What changes in your career the day you get certified",
    pt: "O que muda na sua carreira no dia em que você se certifica",
  },
  "land.benefits.title.1": { es: "Seis cosas concretas que pasan", en: "Six concrete things that happen", pt: "Seis coisas concretas que acontecem" },
  "land.benefits.title.2": { es: "después", en: "after", pt: "depois" },
  "land.benefits.title.3": { es: "del diploma", en: "the diploma", pt: "do diploma" },
  "land.benefits.body": {
    es: "Esta no es la lista corporativa habitual. Cada punto responde a un momento real que vivirá: la negociación de aumento, la postulación grande, el mensaje del head-hunter, el cliente que le pide credibilidad.",
    en: "This isn't the usual corporate list. Each point speaks to a real moment you'll live: the raise negotiation, the big application, the head-hunter's message, the client asking for credibility.",
    pt: "Esta não é a lista corporativa de sempre. Cada ponto responde a um momento real que você viverá: a negociação de aumento, a candidatura grande, a mensagem do head-hunter, o cliente que pede credibilidade.",
  },

  // Steps
  "step.01.title": { es: "Crea tu cuenta", en: "Create your account", pt: "Crie sua conta" },
  "step.01.desc": {
    es: "Correo, datos personales y autorización de tratamiento. Tres campos.",
    en: "Email, personal data and data-processing consent. Three fields.",
    pt: "E-mail, dados pessoais e autorização de tratamento. Três campos.",
  },
  "step.02.title": { es: "Elige tu certificación", en: "Pick your certification", pt: "Escolha sua certificação" },
  "step.02.desc": {
    es: "Programa alineado al cargo o al rol que ocupas hoy.",
    en: "Program aligned to the role or position you hold today.",
    pt: "Programa alinhado ao cargo ou função que você ocupa hoje.",
  },
  "step.03.title": { es: "Paga con seguridad", en: "Pay securely", pt: "Pague com segurança" },
  "step.03.desc": {
    es: "Tarjeta, PSE o transferencia con confirmación. Nada avanza sin recibo.",
    en: "Card, PSE or confirmed transfer. Nothing moves without the receipt.",
    pt: "Cartão, PSE ou transferência confirmada. Nada avança sem o recibo.",
  },
  "step.04.title": { es: "Carga tus documentos", en: "Upload your documents", pt: "Envie seus documentos" },
  "step.04.desc": {
    es: "Hoja de vida, cédula y foto. Los revisa una persona real, no una IA.",
    en: "CV, ID and photo. A real person reviews them, not an AI.",
    pt: "Currículo, documento e foto. Uma pessoa real revisa, não uma IA.",
  },
  "step.05.title": { es: "Agenda la prueba", en: "Schedule the test", pt: "Agende a prova" },
  "step.05.desc": {
    es: "Tú escoges la fecha y la hora del examen.",
    en: "You pick the exam date and time.",
    pt: "Você escolhe a data e a hora da prova.",
  },
  "step.06.title": { es: "Presenta la evaluación", en: "Take the evaluation", pt: "Faça a avaliação" },
  "step.06.desc": {
    es: "Online, con tiempo controlado y reglas de integridad declaradas.",
    en: "Online, with controlled timing and declared integrity rules.",
    pt: "Online, com tempo controlado e regras de integridade declaradas.",
  },
  "step.07.title": { es: "Recibe tu resultado", en: "Get your result", pt: "Receba seu resultado" },
  "step.07.desc": {
    es: "Calificación automática; revisión por comité cuando aplique.",
    en: "Automatic grading; committee review when applicable.",
    pt: "Nota automática; revisão por comitê quando aplicável.",
  },
  "step.08.title": { es: "Descarga tu diploma", en: "Download your diploma", pt: "Baixe seu diploma" },
  "step.08.desc": {
    es: "PDF con QR, sello dorado y datos formales para imprimir.",
    en: "PDF with QR, gold seal and formal details, ready to print.",
    pt: "PDF com QR, selo dourado e dados formais para imprimir.",
  },
  "step.09.title": { es: "Comparte el código", en: "Share the code", pt: "Compartilhe o código" },
  "step.09.desc": {
    es: "Cualquier tercero verifica tu certificado desde nuestra web.",
    en: "Any third party verifies your certificate from our website.",
    pt: "Qualquer terceiro verifica seu certificado em nosso site.",
  },
  "step.10.title": { es: "Recertifícate a tiempo", en: "Recertify on time", pt: "Recertifique-se a tempo" },
  "step.10.desc": {
    es: "Te avisamos antes del vencimiento. Sin sorpresas.",
    en: "We warn you before expiry. No surprises.",
    pt: "Avisamos antes do vencimento. Sem surpresas.",
  },

  "land.process.eyebrow": {
    es: "Cómo funciona, sin letra menuda",
    en: "How it works, no fine print",
    pt: "Como funciona, sem letras miúdas",
  },
  "land.process.title": {
    es: "Diez pasos desde “quiero certificarme” hasta el QR en el LinkedIn",
    en: "Ten steps from “I want to get certified” to the QR on your LinkedIn",
    pt: "Dez passos de “quero me certificar” ao QR no LinkedIn",
  },
  "land.process.body": {
    es: "Tiempo total medio: una semana hábil. Sin filas, sin fotocopias, sin viajar.",
    en: "Average total time: one business week. No queues, no photocopies, no travel.",
    pt: "Tempo total médio: uma semana útil. Sem filas, sem fotocópias, sem viagens.",
  },
  "land.process.stepLabel": { es: "Paso", en: "Step", pt: "Passo" },

  // Comparison
  "comp.col.criterion": { es: "Criterio", en: "Criterion", pt: "Critério" },
  "comp.col.them": { es: "Curso o constancia común", en: "Common course or certificate", pt: "Curso ou certificado comum" },
  "comp.col.us.prefix": { es: "Certificación CIOC ·", en: "CIOC Certification ·", pt: "Certificação CIOC ·" },

  "comp.pub.axis": { es: "Verificación pública", en: "Public verification", pt: "Verificação pública" },
  "comp.pub.them": { es: "PDF con un código que nadie valida", en: "PDF with a code nobody validates", pt: "PDF com um código que ninguém valida" },
  "comp.pub.us": { es: "QR + página pública con firma y vigencia", en: "QR + public page with signature and validity", pt: "QR + página pública com assinatura e validade" },
  "comp.exam.axis": { es: "Control del examen", en: "Exam control", pt: "Controle da prova" },
  "comp.exam.them": {
    es: "Trivia con respuestas a la vista del navegador",
    en: "Trivia with answers visible in the browser",
    pt: "Trivia com respostas à vista no navegador",
  },
  "comp.exam.us": {
    es: "Marca de agua, tiempo por pregunta, anti-screenshot",
    en: "Watermark, per-question timing, anti-screenshot",
    pt: "Marca d'água, tempo por pergunta, anti-screenshot",
  },
  "comp.norm.axis": { es: "Norma de referencia", en: "Reference standard", pt: "Norma de referência" },
  "comp.norm.them": { es: "Sin estándar declarado", en: "No declared standard", pt: "Sem padrão declarado" },
  "comp.norm.us": { es: "Estructurado bajo ISO/IEC 17024", en: "Structured under ISO/IEC 17024", pt: "Estruturado sob ISO/IEC 17024" },
  "comp.human.axis": { es: "Revisión humana", en: "Human review", pt: "Revisão humana" },
  "comp.human.them": { es: "Todo automático, sin contraste", en: "All automatic, no contrast", pt: "Tudo automático, sem contraste" },
  "comp.human.us": {
    es: "Comité evaluador en casos prácticos y apelaciones",
    en: "Evaluation committee for practical cases and appeals",
    pt: "Comitê avaliador em casos práticos e apelações",
  },
  "comp.expiry.axis": { es: "Vencimiento", en: "Expiry", pt: "Vencimento" },
  "comp.expiry.them": {
    es: "Sin recordatorio (caduca y nadie avisa)",
    en: "No reminder (it expires and no one tells you)",
    pt: "Sem lembrete (vence e ninguém avisa)",
  },
  "comp.expiry.us": {
    es: "Avisos 90/60/30 días + recertificación con un clic",
    en: "Reminders at 90/60/30 days + one-click recertification",
    pt: "Avisos em 90/60/30 dias + recertificação com um clique",
  },
  "comp.continuity.axis": { es: "Continuidad", en: "Continuity", pt: "Continuidade" },
  "comp.continuity.them": {
    es: "Si la plataforma cierra, su certificado desaparece",
    en: "If the platform shuts down, your certificate disappears",
    pt: "Se a plataforma fechar, seu certificado some",
  },
  "comp.continuity.us": {
    es: "Histórico permanente verificable mientras exista el dominio",
    en: "Permanent verifiable history as long as the domain exists",
    pt: "Histórico permanente verificável enquanto o domínio existir",
  },

  "land.comp.eyebrow": { es: "Por qué no es lo mismo", en: "Why it's not the same", pt: "Por que não é a mesma coisa" },
  "land.comp.title.1": { es: "Diploma colgado en la pared", en: "Diploma hung on the wall", pt: "Diploma pendurado na parede" },
  "land.comp.title.2": {
    es: "vs. credencial que aguanta una auditoría",
    en: "vs. a credential that holds up to an audit",
    pt: "vs. credencial que aguenta uma auditoria",
  },
  "land.comp.body": {
    es: "Hay muchos cursos. Muy pocos terminan en algo que un auditor de la Súper, un cliente nuevo o un reclutador puedan verificar ellos mismos. Esta es la diferencia, punto por punto.",
    en: "Plenty of courses exist. Few end with something a regulator's auditor, a new client or a recruiter can verify themselves. Here's the difference, point by point.",
    pt: "Há muitos cursos. Poucos terminam em algo que um auditor do regulador, um cliente novo ou um recrutador possam verificar por conta própria. Esta é a diferença, ponto a ponto.",
  },
  "land.comp.footer": {
    es: "Si su programa actual tiene todas las columnas verdes, perfecto. Si no — hablemos.",
    en: "If your current program ticks every green column, great. If not — let's talk.",
    pt: "Se seu programa atual tem todas as colunas verdes, ótimo. Se não — conversemos.",
  },

  // FAQ home
  "faq.q1.q": { es: "¿Qué es una certificación de competencias?", en: "What is a competency certification?", pt: "O que é uma certificação de competências?" },
  "faq.q1.a": {
    es: "Es el proceso mediante el cual una entidad evalúa formalmente si una persona cumple con los conocimientos y habilidades de un perfil profesional, bajo los principios de la norma ISO/IEC 17024. Al aprobarlo, recibe un certificado verificable.",
    en: "It is the process through which an organization formally evaluates whether a person meets the knowledge and skills of a professional profile, under the principles of ISO/IEC 17024. Upon passing, you receive a verifiable certificate.",
    pt: "É o processo pelo qual uma entidade avalia formalmente se uma pessoa atende aos conhecimentos e habilidades de um perfil profissional, sob os princípios da ISO/IEC 17024. Ao aprovar, você recebe um certificado verificável.",
  },
  "faq.q2.q": { es: "¿Cómo puedo certificarme con RISKS INTERNATIONAL?", en: "How can I get certified with RISKS INTERNATIONAL?", pt: "Como posso me certificar com a RISKS INTERNATIONAL?" },
  "faq.q2.a": {
    es: "Crea tu cuenta, elige la certificación de tu interés, paga la inscripción, agenda y presenta la evaluación en línea. Si apruebas, descargas tu diploma con código único y QR.",
    en: "Create your account, pick the certification you're interested in, pay the fee, schedule and take the evaluation online. If you pass, you download your diploma with a unique code and QR.",
    pt: "Crie sua conta, escolha a certificação de seu interesse, pague a inscrição, agende e realize a avaliação online. Se aprovado, você baixa seu diploma com código único e QR.",
  },
  "faq.q3.q": { es: "¿Las pruebas son virtuales?", en: "Are the tests virtual?", pt: "As provas são virtuais?" },
  "faq.q3.a": {
    es: "Sí. Todas las evaluaciones se presentan en una plataforma digital segura, con tiempo controlado, registro de presentación y reglas de antifraude básico.",
    en: "Yes. All evaluations are taken on a secure digital platform, with controlled timing, attendance log and basic anti-fraud rules.",
    pt: "Sim. Todas as avaliações são feitas em uma plataforma digital segura, com tempo controlado, registro de presença e regras básicas de antifraude.",
  },
  "faq.q4.q": { es: "¿El certificado se puede verificar en línea?", en: "Can the certificate be verified online?", pt: "O certificado pode ser verificado online?" },
  "faq.q4.a": {
    es: "Sí. Cada certificado tiene un código único y QR que cualquier persona puede validar públicamente desde la página de verificación.",
    en: "Yes. Every certificate has a unique code and QR that anyone can validate publicly from the verification page.",
    pt: "Sim. Cada certificado tem um código único e QR que qualquer pessoa pode validar publicamente na página de verificação.",
  },
  "faq.q5.q": { es: "¿Cuánto tiempo tiene vigencia la certificación?", en: "How long is the certification valid?", pt: "Por quanto tempo a certificação é válida?" },
  "faq.q5.a": {
    es: "Los programas principales tienen una vigencia de 3 años. Antes del vencimiento recibirás recordatorios para iniciar la recertificación.",
    en: "The main programs are valid for 3 years. Before expiry, you'll get reminders to start recertification.",
    pt: "Os programas principais têm validade de 3 anos. Antes do vencimento, você receberá lembretes para iniciar a recertificação.",
  },

  // Testimonials
  "testimonial.carolina.quote": {
    es: "Lo subí al LinkedIn un martes. El jueves siguiente me escribió una head-hunter para una vacante en banca. Tres semanas después estaba firmando contrato — con 28 % más de lo que ganaba.",
    en: "I posted it on LinkedIn on a Tuesday. The next Thursday a head-hunter wrote me about a banking role. Three weeks later I was signing — 28% above my old salary.",
    pt: "Postei no LinkedIn numa terça. Na quinta seguinte uma head-hunter me escreveu por uma vaga em banco. Três semanas depois eu estava assinando — 28% acima do que ganhava.",
  },
  "testimonial.carolina.role": { es: "Oficial de cumplimiento", en: "Compliance officer", pt: "Oficial de conformidade" },
  "testimonial.carolina.sector": { es: "Sector financiero", en: "Financial sector", pt: "Setor financeiro" },
  "testimonial.carolina.outcome": { es: "+28 % en su nuevo salario", en: "+28% in her new salary", pt: "+28% no novo salário" },
  "testimonial.andres.quote": {
    es: "Llevaba dos años pidiendo el ascenso a líder del área. Llegué a la reunión de evaluación con el diploma y el código QR impreso. No tuvieron mucho que decir — me lo dieron esa misma semana.",
    en: "I'd been asking for the team-lead promotion for two years. I walked into the review with the diploma and the QR printed. Not much left to argue — they gave it to me that same week.",
    pt: "Eu pedia a promoção a líder de área há dois anos. Cheguei à reunião de avaliação com o diploma e o QR impresso. Pouco a discutir — me deram naquela mesma semana.",
  },
  "testimonial.andres.role": { es: "De analista a líder SARLAFT", en: "From analyst to AML team lead", pt: "De analista a líder PLD" },
  "testimonial.andres.sector": { es: "Cooperativa financiera", en: "Financial cooperative", pt: "Cooperativa financeira" },
  "testimonial.andres.outcome": { es: "Ascenso en 7 días", en: "Promoted in 7 days", pt: "Promoção em 7 dias" },
  "testimonial.diana.quote": {
    es: "Soy consultora independiente. Antes mandaba 20 propuestas para cerrar una. Ahora mando 5 y firmo 2. Mis clientes ven el QR, me validan, y eso ya cierra la conversación de credibilidad.",
    en: "I'm an independent consultant. I used to send 20 proposals to close one. Now I send 5 and close 2. Clients see the QR, verify me, and the credibility conversation is already over.",
    pt: "Sou consultora independente. Antes enviava 20 propostas para fechar uma. Agora envio 5 e fecho 2. Meus clientes veem o QR, me validam, e a conversa de credibilidade já está encerrada.",
  },
  "testimonial.diana.role": { es: "Consultora", en: "Consultant", pt: "Consultora" },
  "testimonial.diana.sector": { es: "Compliance LA/FT", en: "AML compliance", pt: "Conformidade PLD" },
  "testimonial.diana.outcome": { es: "Tasa de cierre 4× mayor", en: "Close rate 4× higher", pt: "Taxa de fechamento 4× maior" },

  "land.testimonials.eyebrow": {
    es: "Lo dicen ellos, con números encima",
    en: "Their words, with the numbers attached",
    pt: "Eles dizem, com números em cima",
  },
  "land.testimonials.title.1": { es: "Tres historias", en: "Three stories", pt: "Três histórias" },
  "land.testimonials.title.2": {
    es: "de profesionales que la credencial movió en serio",
    en: "of professionals the credential really moved",
    pt: "de profissionais que a credencial realmente impulsionou",
  },
  "land.testimonials.body": {
    es: "No son testimonios de buena onda. Cada uno trae el dato concreto de qué cambió en su carrera después de certificarse con nosotros.",
    en: "These aren't feel-good blurbs. Each one brings a concrete number on what changed in their career after getting certified with us.",
    pt: "Não são depoimentos de boa onda. Cada um traz o dado concreto do que mudou na sua carreira depois de se certificar conosco.",
  },
  "land.testimonials.foot": {
    es: "Nombres abreviados por confidencialidad. Verificable contactando a quienes nos hayan autorizado contactar — los hay.",
    en: "Names abbreviated for confidentiality. Verifiable by contacting those who have authorized contact — there are some.",
    pt: "Nomes abreviados por confidencialidade. Verificável contatando quem nos autorizou — eles existem.",
  },

  // Deliverables
  "deliverable.diploma.title": { es: "Diploma digital en PDF", en: "Digital diploma in PDF", pt: "Diploma digital em PDF" },
  "deliverable.diploma.detail": {
    es: "Tamaño carta, formato horizontal, sello dorado, código único, firma autorizada. Para imprimir y enmarcar.",
    en: "Letter size, landscape, gold seal, unique code, authorized signature. Ready to print and frame.",
    pt: "Tamanho carta, paisagem, selo dourado, código único, assinatura autorizada. Para imprimir e emoldurar.",
  },
  "deliverable.qr.title": { es: "Código + QR de verificación pública", en: "Code + public verification QR", pt: "Código + QR de verificação pública" },
  "deliverable.qr.detail": {
    es: "Página propia en okacreditado.com/verificar/{su-código} que cualquier tercero abre desde el celular.",
    en: "Dedicated page at okacreditado.com/verificar/{your-code} any third party opens from their phone.",
    pt: "Página dedicada em okacreditado.com/verificar/{seu-código} que qualquer terceiro abre pelo celular.",
  },
  "deliverable.badge.title": { es: "Insignia para LinkedIn y firma", en: "Badge for LinkedIn and email signature", pt: "Badge para LinkedIn e assinatura" },
  "deliverable.badge.detail": {
    es: "Imagen verificable para perfil profesional, hoja de vida y firma de correo. Lista para descargar.",
    en: "Verifiable image for your professional profile, CV and email signature. Ready to download.",
    pt: "Imagem verificável para perfil profissional, currículo e assinatura de e-mail. Pronta para baixar.",
  },
  "deliverable.evidence.title": { es: "Carpeta de evidencias propia", en: "Your own evidence folder", pt: "Sua pasta de evidências" },
  "deliverable.evidence.detail": {
    es: "Documentos cargados, resultados del examen, fecha de presentación, IP, comité revisor — todo trazado y descargable.",
    en: "Uploaded documents, exam results, sitting date, IP, review committee — all traced and downloadable.",
    pt: "Documentos enviados, resultados da prova, data da realização, IP, comitê revisor — tudo rastreado e baixável.",
  },
  "deliverable.bell.title": { es: "Recordatorios de vigencia", en: "Validity reminders", pt: "Lembretes de validade" },
  "deliverable.bell.detail": {
    es: "Avisos 90, 60 y 30 días antes del vencimiento, por correo. La carrera no se pausa por una fecha que se le pasó.",
    en: "Alerts 90, 60 and 30 days before expiry, by email. Your career won't stall over a date you missed.",
    pt: "Avisos 90, 60 e 30 dias antes do vencimento, por e-mail. Sua carreira não para por uma data esquecida.",
  },
  "deliverable.recert.title": { es: "Recertificación con un clic", en: "One-click recertification", pt: "Recertificação com um clique" },
  "deliverable.recert.detail": {
    es: "Cuando toque renovar, no empieza de cero. El sistema reconoce su histórico y le pide solo lo nuevo.",
    en: "When it's time to renew, you don't start over. The system recognizes your history and asks only for what's new.",
    pt: "Quando for renovar, você não começa do zero. O sistema reconhece seu histórico e pede só o que é novo.",
  },

  "land.deliv.eyebrow": {
    es: "Qué se lleva a casa el día de la emisión",
    en: "What you take home the day it's issued",
    pt: "O que você leva no dia da emissão",
  },
  "land.deliv.title.1": { es: "No es solo un PDF. Es", en: "Not just a PDF. It's", pt: "Não é só um PDF. É" },
  "land.deliv.title.2": { es: "un kit completo", en: "a complete kit", pt: "um kit completo" },
  "land.deliv.title.3": { es: "de credibilidad profesional.", en: "of professional credibility.", pt: "de credibilidade profissional." },
  "land.deliv.body": {
    es: "Todo lo que necesita para que reclutadores, empleadores, clientes y entes de control validen su perfil en segundos — entregado en su correo el mismo día de la aprobación.",
    en: "Everything you need so recruiters, employers, clients and regulators can verify your profile in seconds — delivered to your inbox the day you pass.",
    pt: "Tudo o que você precisa para que recrutadores, empregadores, clientes e reguladores validem seu perfil em segundos — entregue no seu e-mail no dia da aprovação.",
  },
  "land.deliv.note.bold": { es: "Todo digital, todo verificable.", en: "All digital, all verifiable.", pt: "Tudo digital, tudo verificável." },
  "land.deliv.note.rest": {
    es: " Sin pasar por una oficina, sin fotocopias, sin sellos físicos. Su credencial vive en internet y la actualizamos por usted.",
    en: " No office visits, no photocopies, no physical stamps. Your credential lives on the web and we keep it current for you.",
    pt: " Sem ir a um escritório, sem fotocópias, sem carimbos físicos. Sua credencial vive na web e nós a mantemos atualizada para você.",
  },
  "land.deliv.cta": { es: "Quiero mi kit completo →", en: "I want my full kit →", pt: "Quero meu kit completo →" },

  // ROI
  "roi.salary.label": { es: "Diferencia salarial promedio con certificación", en: "Average salary lift with certification", pt: "Diferença salarial média com certificação" },
  "roi.salary.value": { es: "+22 %", en: "+22%", pt: "+22%" },
  "roi.salary.hint": {
    es: "Oficial de cumplimiento certificado vs. no certificado · Colombia 2025",
    en: "Certified vs. non-certified compliance officer · Colombia 2025",
    pt: "Oficial de conformidade certificado vs. não certificado · Colômbia 2025",
  },
  "roi.time.label": { es: "Tiempo entre certificarse y nueva oferta", en: "Time between certifying and a new offer", pt: "Tempo entre se certificar e nova oferta" },
  "roi.time.value": { es: "≤ 60 días", en: "≤ 60 days", pt: "≤ 60 dias" },
  "roi.time.hint": {
    es: "Mediana reportada por egresados que comparten en LinkedIn",
    en: "Median reported by graduates sharing on LinkedIn",
    pt: "Mediana reportada por egressos que compartilham no LinkedIn",
  },
  "roi.payback.label": { es: "Recuperación de la inversión", en: "Investment payback", pt: "Recuperação do investimento" },
  "roi.payback.value": { es: "1 mes", en: "1 month", pt: "1 mês" },
  "roi.payback.hint": {
    es: "Con el primer aumento o el primer cliente cerrado, queda paga",
    en: "With the first raise or first client closed, it's paid back",
    pt: "Com o primeiro aumento ou primeiro cliente fechado, já se paga",
  },
  "roi.life.label": { es: "Vida útil de la credencial", en: "Credential lifetime", pt: "Vida útil da credencial" },
  "roi.life.value": { es: "3 años", en: "3 years", pt: "3 anos" },
  "roi.life.hint": {
    es: "Con recertificación asistida, sin tener que volver a empezar",
    en: "With assisted recertification, no need to start over",
    pt: "Com recertificação assistida, sem precisar recomeçar",
  },

  "land.roi.eyebrow": { es: "La pregunta honesta", en: "The honest question", pt: "A pergunta honesta" },
  "land.roi.title.1": { es: "¿Vale la pena", en: "Is it worth", pt: "Vale a pena" },
  "land.roi.title.2": { es: "la inversión?", en: "the investment?", pt: "o investimento?" },
  "land.roi.body": {
    es: "Lo entendemos: certificarse cuesta plata. Pero lo que se recupera no es teórico — se mide en pesos en su próxima liquidación, en clientes nuevos, en una oferta mejor.",
    en: "We get it: certification costs money. But what you get back isn't theoretical — it shows up in your next paycheck, in new clients, in a better offer.",
    pt: "Entendemos: certificar-se custa dinheiro. Mas o que se recupera não é teórico — aparece no próximo holerite, em clientes novos, numa oferta melhor.",
  },
  "land.roi.note": {
    es: "Los números de la derecha son del mercado colombiano — portales de empleo, reportes salariales y testimonios públicos de personas certificadas durante 2024-2026.",
    en: "The numbers on the right come from the Colombian market — job boards, salary reports and public testimonials from certified people during 2024-2026.",
    pt: "Os números à direita vêm do mercado colombiano — portais de emprego, relatórios salariais e depoimentos públicos de certificados em 2024-2026.",
  },
  "land.roi.cta": { es: "Iniciar ahora y recuperarlo pronto", en: "Start now and pay it back fast", pt: "Comece agora e recupere logo" },

  // Catálogo activo
  "land.catalog.eyebrow": { es: "Catálogo activo", en: "Active catalog", pt: "Catálogo ativo" },
  "land.catalog.title": {
    es: "Programas alineados al cargo que ya ocupas",
    en: "Programs aligned to the role you already hold",
    pt: "Programas alinhados ao cargo que você já ocupa",
  },
  "land.catalog.body": {
    es: "Cada certificación responde a una norma de referencia y a un cargo real del sector. No vendemos cursos: acreditamos competencias.",
    en: "Each certification maps to a reference standard and a real role in the sector. We don't sell courses: we accredit competencies.",
    pt: "Cada certificação responde a uma norma de referência e a um cargo real do setor. Não vendemos cursos: acreditamos competências.",
  },
  "land.catalog.link": { es: "Ver catálogo completo →", en: "View full catalog →", pt: "Ver catálogo completo →" },
  "land.cert.comingSoon": { es: "Próximamente", en: "Coming soon", pt: "Em breve" },
  "land.cert.notifyMe": { es: "Notificarme", en: "Notify me", pt: "Avisar-me" },
  "land.cert.requestInfo": { es: "Solicitar info", en: "Request info", pt: "Solicitar info" },
  "land.cert.enroll": { es: "Inscribirme", en: "Enroll", pt: "Inscrever-me" },
  "land.cert.details": { es: "Ver detalles", en: "View details", pt: "Ver detalhes" },
  "land.cert.duration": { es: "Duración", en: "Duration", pt: "Duração" },
  "land.cert.validity": { es: "Vigencia", en: "Validity", pt: "Validade" },
  "land.cert.investment": { es: "Inversión", en: "Investment", pt: "Investimento" },
  "land.cert.consult": { es: "Consultar", en: "Inquire", pt: "Consultar" },
  "land.cert.years": { es: "años", en: "years", pt: "anos" },
  "land.cert.min": { es: "min", en: "min", pt: "min" },

  // Letter / origin
  "land.letter.eyebrow": { es: "Carta abierta del equipo", en: "Open letter from the team", pt: "Carta aberta da equipe" },
  "land.letter.quote": {
    es: "“Construimos esto porque a nosotros nos hizo falta cuando empezamos.”",
    en: "“We built this because we needed it ourselves when we started.”",
    pt: "“Construímos isto porque precisávamos disso quando começamos.”",
  },
  "land.letter.p1": {
    es: "Durante años acompañamos a oficiales de cumplimiento que hacían bien su trabajo, pero no tenían cómo demostrarlo cuando llegaba una nueva visita de la Súper, un cambio de empleador o una postulación grande. El conocimiento estaba. El soporte formal, no.",
    en: "For years we supported compliance officers who did their job well, but had no way to prove it when the regulator visited, when they changed employers, or when applying for a big role. The knowledge was there. The formal proof wasn't.",
    pt: "Por anos acompanhamos oficiais de conformidade que faziam seu trabalho bem, mas não tinham como comprovar quando o regulador visitava, ao mudar de empregador ou numa candidatura grande. O conhecimento existia. A comprovação formal, não.",
  },
  "land.letter.p2.before": { es: "Esta plataforma es nuestra respuesta. Una credencial digital, construida bajo ", en: "This platform is our answer. A digital credential, built under ", pt: "Esta plataforma é nossa resposta. Uma credencial digital, construída sob " },
  "land.letter.p2.after": {
    es: ", con examen serio, QR público y vigencia controlada — para que el trabajo bien hecho no se pierda en una hoja sin sello.",
    en: ", with a serious exam, public QR and controlled validity — so well-done work doesn't get lost on a paper without a seal.",
    pt: ", com prova séria, QR público e validade controlada — para que o bom trabalho não se perca numa folha sem selo.",
  },
  "land.letter.signLabel": { es: "Equipo", en: "Team", pt: "Equipe" },
  "land.letter.signSub": {
    es: "Compliance · SARLAFT · SAGRILAFT · Debida diligencia · ",
    en: "Compliance · AML · Sanctions · Due diligence · ",
    pt: "Conformidade · PLD · Sanções · Diligência prévia · ",
  },
  "land.letter.contactCta": { es: "Hablar con nosotros", en: "Talk to us", pt: "Falar conosco" },

  // Exam preview block (in page.tsx)
  "land.examPrev.eyebrow": { es: "Examen, no formulario", en: "Exam, not a form", pt: "Prova, não formulário" },
  "land.examPrev.title": {
    es: "Si la prueba es seria, el certificado pesa",
    en: "If the test is serious, the certificate carries weight",
    pt: "Se a prova é séria, o certificado pesa",
  },
  "land.examPrev.body": {
    es: "Cada candidato presenta sobre un banco aleatorio de preguntas, con su nombre marcado en pantalla, tiempo por pregunta y registro de todo lo que pasa durante el examen. No es trivia: es evaluación real.",
    en: "Each candidate takes a randomized question bank, with their name watermarked on screen, per-question timing and a full log of what happens during the exam. It's not trivia: it's real evaluation.",
    pt: "Cada candidato faz a partir de um banco aleatório de perguntas, com seu nome marcado na tela, tempo por pergunta e registro de tudo durante a prova. Não é trivia: é avaliação real.",
  },
  "land.examPrev.f1": { es: "Preguntas aleatorias por banco y nivel de dificultad", en: "Random questions by bank and difficulty level", pt: "Perguntas aleatórias por banco e nível de dificuldade" },
  "land.examPrev.f2": { es: "Tiempo controlado con guardado automático", en: "Controlled timing with autosave", pt: "Tempo controlado com salvamento automático" },
  "land.examPrev.f3": { es: "Calificación automática + manual con rúbricas", en: "Automatic + manual grading with rubrics", pt: "Nota automática + manual com rubricas" },
  "land.examPrev.f4": { es: "Marca de agua personal + bloqueo de PrintScreen", en: "Personal watermark + PrintScreen blocking", pt: "Marca d'água pessoal + bloqueio de PrintScreen" },
  "land.examPrev.f5": { es: "Registro de salidas de pantalla y foco", en: "Log of focus loss and screen exits", pt: "Registro de saídas de tela e foco" },
  "land.examPrev.f6": { es: "Revisión por evaluador y comité cuando aplique", en: "Review by evaluator and committee when applicable", pt: "Revisão por avaliador e comitê quando aplicável" },

  // Diploma gallery section
  "land.gallery.badge": { es: "Diploma final", en: "Final diploma", pt: "Diploma final" },
  "land.gallery.title.1": { es: "Diseñado para imprimirlo", en: "Designed to print", pt: "Feito para imprimir" },
  "land.gallery.title.2": {
    es: "y enmarcarlo — o para colgarlo en su firma de correo",
    en: "and frame — or to hang in your email signature",
    pt: "e emoldurar — ou para colocar na sua assinatura de e-mail",
  },
  "land.gallery.body.before": { es: "Cada certificado emitido por ", en: "Each certificate issued by ", pt: "Cada certificado emitido por " },
  "land.gallery.body.after": {
    es: " S.A.S. lleva código único, QR de verificación, firma autorizada y la marca institucional. Inspira confianza ante empleadores, clientes y autoridades.",
    en: " S.A.S. carries a unique code, verification QR, authorized signature and institutional branding. It builds trust with employers, clients and authorities.",
    pt: " S.A.S. tem código único, QR de verificação, assinatura autorizada e a marca institucional. Inspira confiança a empregadores, clientes e autoridades.",
  },

  // Verificación pública section
  "land.verify.badge": { es: "Verificación pública abierta", en: "Open public verification", pt: "Verificação pública aberta" },
  "land.verify.title": {
    es: "¿Le pasaron un certificado? Confírmelo en diez segundos",
    en: "Got a certificate handed to you? Confirm it in ten seconds",
    pt: "Recebeu um certificado? Confirme em dez segundos",
  },
  "land.verify.body.before": { es: "Empresas, empleadores, clientes y entes de control validan cualquier certificado emitido por ", en: "Companies, employers, clients and regulators validate any certificate issued by ", pt: "Empresas, empregadores, clientes e reguladores validam qualquer certificado emitido por " },
  "land.verify.body.after": { es: " con solo el código o el QR del documento.", en: " with just the code or QR from the document.", pt: " só com o código ou o QR do documento." },
  "land.verify.placeholder": {
    es: "Ingrese el código (p. ej. CERT-2026-XXXX)",
    en: "Enter the code (e.g. CERT-2026-XXXX)",
    pt: "Digite o código (ex.: CERT-2026-XXXX)",
  },
  "land.verify.btn": { es: "Verificar", en: "Verify", pt: "Verificar" },
  "land.verify.alt": {
    es: "También puede escanear el QR impreso en el diploma.",
    en: "You can also scan the QR printed on the diploma.",
    pt: "Você também pode escanear o QR impresso no diploma.",
  },

  // Recert section
  "land.recert.eyebrow": { es: "Vigencia bajo control", en: "Validity under control", pt: "Validade sob controle" },
  "land.recert.title": {
    es: "Su certificado no se le vence a la mala",
    en: "Your certificate won't expire on you the hard way",
    pt: "Seu certificado não vence de surpresa",
  },
  "land.recert.body": {
    es: "Una competencia profesional se mantiene. Por eso el sistema cuenta los meses por usted y le abre la puerta para recertificarse antes de que el diploma quede en rojo.",
    en: "A professional competency is something you maintain. That's why the system counts the months for you and opens the door to recertify before your diploma goes red.",
    pt: "Uma competência profissional se mantém. Por isso o sistema conta os meses por você e abre a porta para recertificação antes que o diploma fique vermelho.",
  },
  "land.recert.link": { es: "Ver mis opciones de recertificación →", en: "See my recertification options →", pt: "Ver minhas opções de recertificação →" },
  "land.recert.f1": { es: "Avisos 90, 60 y 30 días antes", en: "Reminders at 90, 60 and 30 days", pt: "Avisos em 90, 60 e 30 dias" },
  "land.recert.f2": { es: "Notificaciones por correo electrónico", en: "Email notifications", pt: "Notificações por e-mail" },
  "land.recert.f3": { es: "Renovación digital sin trámites presenciales", en: "Digital renewal with no in-person paperwork", pt: "Renovação digital sem burocracia presencial" },
  "land.recert.f4": { es: "Histórico permanente de tus certificaciones", en: "Permanent history of your certifications", pt: "Histórico permanente de suas certificações" },
  "land.recert.f5": { es: "Estado en tiempo real: vigente, vencido o anulado", en: "Real-time status: active, expired or revoked", pt: "Status em tempo real: vigente, vencido ou cancelado" },
  "land.recert.f6": { es: "Confidencialidad y trazabilidad de cada operación", en: "Confidentiality and traceability of every action", pt: "Confidencialidade e rastreabilidade de cada operação" },

  // Manifesto
  "land.manifesto.quote.1": { es: "El conocimiento sin acreditación es", en: "Knowledge without accreditation is", pt: "Conhecimento sem acreditação é" },
  "land.manifesto.quote.2": { es: "un secreto", en: "a secret", pt: "um segredo" },
  "land.manifesto.quote.3": { es: ". Acreditado, es", en: ". Accredited, it's", pt: ". Acreditado, é" },
  "land.manifesto.quote.4": { es: "una palanca", en: "a lever", pt: "uma alavanca" },
  "land.manifesto.foot.before": { es: "Filosofía de", en: "Philosophy of", pt: "Filosofia de" },
  "land.manifesto.foot.after": { es: "S.A.S. · 2014 → hoy", en: "S.A.S. · 2014 → today", pt: "S.A.S. · 2014 → hoje" },

  // FAQ block
  "land.faq.eyebrow": { es: "Lo que más nos preguntan", en: "What we get asked most", pt: "O que mais nos perguntam" },
  "land.faq.title": { es: "Preguntas frecuentes", en: "Frequently asked questions", pt: "Perguntas frequentes" },
  "land.faq.body.before": { es: "¿Quedó algo en el aire? Mire la ", en: "Anything left unanswered? Check the ", pt: "Ficou algo no ar? Veja a " },
  "land.faq.body.link": { es: "página completa de FAQ", en: "full FAQ page", pt: "página completa de FAQ" },
  "land.faq.body.after": { es: " o escríbanos por WhatsApp.", en: " or message us on WhatsApp.", pt: " ou escreva pelo WhatsApp." },

  // Final CTA
  "land.finalCta.title.1": { es: "En 7 días hábiles puede firmar como", en: "In 7 business days you can sign as a", pt: "Em 7 dias úteis você pode assinar como" },
  "land.finalCta.title.2": { es: "Profesional Certificado.", en: "Certified Professional.", pt: "Profissional Certificado." },
  "land.finalCta.body": {
    es: "Una decisión hoy. Una credencial el otro lunes. Una conversación de carrera diferente el lunes siguiente — con su jefe, con un cliente, con el head-hunter que ya va a poder validarlo.",
    en: "One decision today. A credential by next Monday. A different career conversation the Monday after — with your boss, with a client, with the head-hunter who can now verify you.",
    pt: "Uma decisão hoje. Uma credencial na próxima segunda. Uma conversa de carreira diferente na segunda seguinte — com seu chefe, com um cliente, com o head-hunter que já poderá validá-lo.",
  },
  "land.finalCta.primary": { es: "Empezar ahora · llega a mi correo el lunes", en: "Start now · arrives in my inbox Monday", pt: "Começar agora · chega no meu e-mail na segunda" },
  "land.finalCta.secondary": { es: "Crear cuenta sin pagar", en: "Create a free account", pt: "Criar conta sem pagar" },
  "land.finalCta.tertiary": { es: "Comparar programas →", en: "Compare programs →", pt: "Comparar programas →" },
  "land.finalCta.handwritten": {
    es: "— Lo más importante que va a hacer este mes por su carrera.",
    en: "— The most important thing you'll do this month for your career.",
    pt: "— A coisa mais importante que você fará este mês pela sua carreira.",
  },

  // Hero floating mock labels
  "land.hero.mock.status": { es: "Estado", en: "Status", pt: "Status" },
  "land.hero.mock.statusValue": { es: "✓ Verificado", en: "✓ Verified", pt: "✓ Verificado" },
  "land.hero.mock.validity": { es: "Vigencia", en: "Validity", pt: "Validade" },
  "land.hero.mock.validityValue": { es: "3 años", en: "3 years", pt: "3 anos" },
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
