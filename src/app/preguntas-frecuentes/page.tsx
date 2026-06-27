import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { FAQList } from "@/components/landing/faq";
import { BRAND, CTAS } from "@/lib/brand";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Preguntas frecuentes sobre certificación de personas",
  description:
    "Resolvemos las dudas más comunes sobre el proceso de certificación de personas, evaluaciones online, vigencia, recertificación y verificación de certificados emitidos por RISKS INTERNATIONAL.",
  alternates: { canonical: "/preguntas-frecuentes" },
  openGraph: {
    title: "Preguntas frecuentes | RISKS INTERNATIONAL",
    description: "Todo sobre el proceso de certificación, evaluaciones online y verificación digital.",
    url: `${BRAND.appUrl}/preguntas-frecuentes`,
    type: "article",
    locale: "es_CO",
  },
};

const FAQS = [
  { q: "¿Qué es una certificación de competencias?", a: "Es el proceso mediante el cual una entidad evalúa formalmente si una persona cumple con los conocimientos y habilidades de un perfil profesional, bajo los principios de la norma ISO/IEC 17024. Al aprobarlo, recibe un certificado verificable." },
  { q: "¿Cómo puedo certificarme con RISKS INTERNATIONAL?", a: "Crea tu cuenta, elige la certificación de interés, paga la inscripción, agenda la prueba y preséntala en línea. Si apruebas, descargas tu diploma con código único y QR." },
  { q: "¿Las pruebas son virtuales?", a: "Sí. Todas las evaluaciones se presentan en una plataforma digital segura, con tiempo controlado, registro de presentación y reglas de antifraude básico (detección de salidas de pantalla, IP, etc.)." },
  { q: "¿El certificado se puede verificar en línea?", a: "Sí. Cada certificado tiene un código único y un QR. Cualquier persona puede validar la autenticidad y vigencia en /verificar." },
  { q: "¿Cuánto tiempo tiene vigencia la certificación?", a: "Depende del esquema. Los programas principales tienen vigencia de 3 años. Antes del vencimiento recibirás recordatorios para iniciar la recertificación." },
  { q: "¿Qué pasa si no apruebo la evaluación?", a: "Recibirás una constancia de presentación que documenta el intento. Según las reglas del esquema, podrás reintentar la evaluación tras un periodo definido." },
  { q: "¿Puedo volver a presentar la prueba?", a: "Sí, dentro de los reintentos que permita el esquema y abonando la tarifa correspondiente. La plataforma lleva el control de intentos." },
  { q: "¿Recibiré un certificado de presentación?", a: "Cuando aplique, se emite una constancia de presentación de examen independientemente del resultado, con QR para evidenciarlo formalmente." },
  { q: "¿Cómo descargo mi diploma?", a: "Una vez aprobado, en /portal/certificados verás tu diploma. Desde la vista de certificado puedes imprimirlo en PDF (A4 horizontal)." },
  { q: "¿Cómo funciona la recertificación?", a: "Antes del vencimiento recibes alerta. Inicias el proceso desde tu portal, presentas la actualización requerida y, al aprobar, se emite un nuevo certificado con vigencia renovada." },
  { q: "¿Puedo presentar la evaluación desde otro país?", a: "Sí. La plataforma es 100% en línea y accesible desde cualquier ubicación con conexión estable a internet." },
  { q: "¿Qué datos personales debo autorizar?", a: "Solo los necesarios para identificar al candidato y emitir el certificado, conforme a nuestra Política de Tratamiento de Datos Personales (Ley 1581/2012 en Colombia y normas aplicables)." },
  { q: "¿Cómo se protege mi información?", a: "Manejamos cifrado en tránsito (HTTPS), control de acceso por roles, auditoría de operaciones críticas y separación multitenant. Los soportes confidenciales solo se sirven con autenticación." },
  { q: "¿Qué incluye mi certificado?", a: "Nombre del titular, documento de identidad, certificación obtenida, fecha de emisión, fecha de vencimiento, código único, QR de verificación, firma autorizada y estado en tiempo real." },
  { q: "¿La plataforma es multilenguaje?", a: "Actualmente operamos en español. Estamos preparando versiones en inglés y portugués para personas y empresas internacionales." },
  { q: "¿Si repruebo el examen qué pasa?", a: "Recibirás una constancia de presentación y podrás reintentar según lo permita el esquema. Los reintentos son gratis dentro del periodo establecido (consulta los términos de tu certificación)." },
  { q: "¿Cuál es el costo de cada certificación?", a: "El precio varía por esquema. SARLAFT es $650.000 COP, SAGRILAFT estará disponible próximamente. Ver /certificaciones para el listado completo de precios." },
  { q: "¿Cómo sé que puedo confiar en RISKS INTERNATIONAL?", a: "Somos organismo certificador acreditado bajo ISO/IEC 17024 por ONAC. Todos nuestros certificados incluyen firma autorizada, sello oficial y código verificable en okacreditado.com/verificar." },
  { q: "¿Qué pasa si abandono antes de terminar el examen?", a: "Se registra el intento y reciben una constancia. El abandono no anula reintentos futuros, pero sí consume uno según las reglas del esquema." },
  { q: "¿Qué empresas aceptan estos certificados?", a: "Bancos, aseguradoras, organismos supervisores y fondos de pensión en Colombia reconocen certificaciones ISO/IEC 17024. El certificado es admisible ante autoridades que exijan competencias verificadas." },
  { q: "¿Hay descuentos para grupos o empresas?", a: "Sí. Contacta a ventas@risksint.com para consultar sobre paquetes corporativos, descuentos volumen y soluciones personalizadas para empresas." },
  { q: "¿Puedo compartir mi certificado públicamente?", a: "Sí. El certificado contiene un código verificable y QR. Puedes compartirlo en LinkedIn, CV, portafolio o email — cualquiera podrá validar su autenticidad en /verificar." },
  { q: "¿Cuánto tiempo tarda emitirse mi certificado?", a: "Una vez aprobado el examen, tu diploma está disponible inmediatamente en /portal/certificados para descargar. El QR de verificación está operativo desde ese momento." },
  { q: "¿Qué debo hacer antes de presentar el examen?", a: "Completa tu registro, sube todos los documentos requeridos, haz el pago y agenda tu sesión. Te recomendamos tener tu computador, cámara web y conexión estable preparados 15 minutos antes." },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />
      <section className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">FAQ</span>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Preguntas frecuentes sobre certificación de personas</h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Todo lo que necesitas saber sobre el proceso de certificación, evaluaciones online, vigencia y verificación digital.
          </p>
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <FAQList items={FAQS} />
          <div className="mt-10 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center">
            <p className="text-sm text-slate-700">¿No encuentras tu respuesta?</p>
            <div className="mt-3 flex justify-center gap-3">
              <Link href={CTAS.contact.href} className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white">Solicitar información</Link>
              <Link href={CTAS.certify.href} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Iniciar mi certificación</Link>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
