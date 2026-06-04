import Link from "next/link";
import { PrivacyAccordion, type PolicySection } from "@/components/privacy-accordion";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Política de tratamiento de datos personales" };

const APP_NAME = "CIOC";

/// Política de tratamiento de datos personales con la estructura del aviso
/// publicado por RISKS INTERNATIONAL S.A.S. en
/// https://www.risksint.com/en/habeas-data/ — adaptada al contexto del
/// proceso de evaluación y certificación de personas (Ley 1581 de 2012,
/// Decreto 1377 de 2013 y normas concordantes en Colombia).
const SECTIONS: PolicySection[] = [
  {
    id: "responsable",
    title: "1. Responsable del tratamiento",
    body: (
      <>
        <p>
          <strong>{BRAND.legalName}</strong>, NIT 900.352.786, con domicilio en Colombia, es el
          responsable del tratamiento de los datos personales recolectados a través de la
          plataforma {APP_NAME} y de cualquier canal asociado al proceso de evaluación y
          certificación de personas.
        </p>
        {BRAND.contactEmail ? (
          <p>
            Cualquier requerimiento relacionado con la protección de datos personales debe
            dirigirse al correo{" "}
            <a className="text-brand-700 underline" href={`mailto:${BRAND.contactEmail}`}>
              {BRAND.contactEmail}
            </a>
            .
          </p>
        ) : null}
      </>
    ),
  },
  {
    id: "marco-legal",
    title: "2. Marco legal aplicable",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Constitución Política de Colombia, artículo 15 (habeas data).</li>
        <li>Ley 1266 de 2008 — datos financieros y crediticios.</li>
        <li>Ley 1581 de 2012 — régimen general de protección de datos personales.</li>
        <li>Decreto 1377 de 2013 — autorización del titular y políticas de tratamiento.</li>
        <li>Decreto 1074 de 2015 — único reglamentario del sector comercio (Capítulo 25).</li>
        <li>Circular Externa 002 de 2015 y demás conceptos de la Superintendencia de Industria y Comercio.</li>
        <li>Norma ISO/IEC 17024 — requisitos para organismos que certifican personas.</li>
      </ul>
    ),
  },
  {
    id: "datos-recolectados",
    title: "3. Datos personales que se recolectan",
    body: (
      <>
        <p>Durante la inscripción, evaluación y emisión del certificado se pueden recolectar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Datos de identificación: nombres, apellidos, tipo y número de documento.</li>
          <li>Datos de contacto: correo electrónico (principal y alternos), teléfono, dirección.</li>
          <li>Datos académicos y profesionales aportados como evidencia.</li>
          <li>Fotografía e imagen para verificación de identidad.</li>
          <li>Evidencias de pago: comprobantes, referencias, sin almacenar números completos de tarjeta.</li>
          <li>Datos técnicos: dirección IP, tipo de dispositivo, navegador, hora de conexión y logs de actividad.</li>
          <li>Resultados de evaluaciones, calificaciones, pérdida de foco y datos antifraude.</li>
        </ul>
        <p className="text-xs text-slate-500">
          No se solicitan datos sensibles salvo los estrictamente necesarios para acomodaciones
          razonables del examen, los cuales requerirán autorización expresa adicional.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "4. Finalidades del tratamiento",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Gestionar la inscripción, evaluación y certificación del titular.</li>
        <li>Verificar la identidad y la veracidad de la información aportada.</li>
        <li>Emitir y verificar públicamente los certificados (QR y URL pública).</li>
        <li>Comunicar al titular notificaciones del proceso (agenda, pagos, resultados).</li>
        <li>Conservar evidencias para auditoría interna, externa y acreditación (mínimo 5 años).</li>
        <li>Atender requerimientos de autoridades de control y supervisión.</li>
        <li>Mejorar continuamente los procesos del Organismo de Certificación de Personas (OCP).</li>
        <li>Enviar comunicaciones comerciales solo si el titular las autoriza expresamente.</li>
      </ul>
    ),
  },
  {
    id: "autorizacion",
    title: "5. Autorización del titular",
    body: (
      <>
        <p>
          Al marcar la casilla de autorización al momento del registro, el titular declara que ha
          leído esta política y autoriza a {BRAND.shortName} a tratar sus datos para las finalidades
          descritas. La plataforma conserva como evidencia digital del consentimiento la fecha,
          hora, dirección IP, versión de la política y finalidades aceptadas.
        </p>
        <p>
          La autorización puede ser revocada en cualquier momento siguiendo el procedimiento
          establecido en la sección de derechos del titular, salvo cuando exista un deber legal o
          contractual que obligue a conservar los datos (por ejemplo, conservación de evidencias
          de evaluación por el plazo definido por la acreditación).
        </p>
      </>
    ),
  },
  {
    id: "derechos",
    title: "6. Derechos del titular",
    body: (
      <>
        <p>El titular tiene derecho a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Conocer, actualizar y rectificar sus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Ser informado del uso que se ha dado a sus datos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
          <li>Revocar la autorización y/o solicitar la supresión, cuando proceda.</li>
          <li>Acceder gratuitamente a sus datos personales que hayan sido objeto de tratamiento.</li>
        </ul>
      </>
    ),
  },
  {
    id: "procedimiento",
    title: "7. Procedimiento para ejercer derechos (consultas y reclamos)",
    body: (
      <>
        <p>
          Las solicitudes deben enviarse al correo del responsable, indicando: nombre completo,
          tipo y número de documento, descripción clara del requerimiento, datos de contacto y
          anexo de soportes cuando sean necesarios.
        </p>
        <p>Tiempos máximos de respuesta (Ley 1581 de 2012):</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Consultas:</strong> 10 días hábiles, prorrogables por 5 días más.</li>
          <li><strong>Reclamos:</strong> 15 días hábiles, prorrogables por 8 días más.</li>
        </ul>
        <p>
          Si la solicitud está incompleta, se requerirá al titular dentro de los 5 días siguientes
          para que la complete. Transcurridos 2 meses sin que se complete, la solicitud se
          entenderá desistida.
        </p>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "8. Transferencia y transmisión de datos",
    body: (
      <>
        <p>
          {BRAND.shortName} puede transmitir datos a encargados que prestan servicios necesarios
          para la operación de la plataforma (hosting, correo transaccional, pasarelas de pago,
          almacenamiento). En todos los casos, se exige a estos encargados garantías equivalentes
          de confidencialidad, integridad y disponibilidad.
        </p>
        <p>
          No se transfieren datos a países sin nivel adecuado de protección sin la autorización
          previa del titular, salvo en los casos legalmente permitidos (artículo 26 de la Ley
          1581 de 2012).
        </p>
      </>
    ),
  },
  {
    id: "conservacion",
    title: "9. Tiempo de conservación",
    body: (
      <p>
        Los datos asociados a un proceso de evaluación y certificación se conservan por un mínimo
        de 5 años como evidencia obligatoria para auditoría y acreditación ISO/IEC 17024,
        contados desde la fecha de emisión o de la última actualización del registro. Cumplido el
        plazo y resueltas las obligaciones legales y contractuales, los datos son anonimizados o
        suprimidos.
      </p>
    ),
  },
  {
    id: "seguridad",
    title: "10. Medidas de seguridad",
    body: (
      <>
        <p>
          La plataforma implementa controles técnicos y administrativos para preservar la
          confidencialidad, integridad y disponibilidad de la información:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Cifrado en tránsito (TLS) y en reposo del almacenamiento de objetos.</li>
          <li>Hash de contraseñas con algoritmos resistentes (bcrypt).</li>
          <li>Sesiones revocables, control de acceso por roles y permisos.</li>
          <li>Registro de auditoría detallado (actor, acción, IP, agente de usuario).</li>
          <li>Backups, monitoreo y endurecimiento de cabeceras HTTP.</li>
        </ul>
      </>
    ),
  },
  {
    id: "menores",
    title: "11. Tratamiento de datos de menores de edad",
    body: (
      <p>
        El servicio está dirigido a personas mayores de 18 años. En caso de tratarse datos de
        menores de edad para procesos especiales, se requerirá la autorización previa y expresa
        de quien ejerza la representación legal, dando prevalencia al interés superior del menor.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "12. Cookies y tecnologías similares",
    body: (
      <>
        <p>
          La plataforma utiliza cookies estrictamente necesarias para mantener la sesión
          autenticada y para recordar preferencias del usuario. No se emplean cookies de
          publicidad ni de terceros para perfilamiento.
        </p>
        <p>
          El titular puede configurar su navegador para bloquear o eliminar las cookies; esto
          puede afectar el funcionamiento normal del servicio.
        </p>
      </>
    ),
  },
  {
    id: "vigencia",
    title: "13. Vigencia y actualizaciones",
    body: (
      <p>
        La presente política rige a partir de su publicación y permanece vigente mientras
        {" "}{BRAND.shortName} opere como organismo de certificación de personas. Las
        modificaciones sustanciales serán comunicadas a través de la plataforma y/o por correo
        electrónico al titular.
      </p>
    ),
  },
  {
    id: "contacto",
    title: "14. Contacto",
    body: (
      <>
        <p>Para ejercer cualquier derecho o presentar peticiones, quejas y reclamos:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Responsable:</strong> {BRAND.legalName}</li>
          {BRAND.contactEmail ? <li><strong>Correo:</strong> {BRAND.contactEmail}</li> : null}
          {BRAND.contactPhone ? <li><strong>Teléfono:</strong> {BRAND.contactPhone}</li> : null}
          <li><strong>Autoridad de control:</strong> Superintendencia de Industria y Comercio — www.sic.gov.co</li>
        </ul>
      </>
    ),
  },
];

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← {APP_NAME}
      </Link>
      <header className="mt-4 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
          Aviso de Habeas Data · Ley 1581 de 2012
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          Política de tratamiento de datos personales
        </h1>
        <p className="text-sm text-slate-600">
          Explore cada cláusula desplegando las secciones. Esta política se aplica a todos los
          datos personales recolectados por {BRAND.legalName} a través de la plataforma
          {" "}{APP_NAME} y de sus canales de atención.
        </p>
      </header>
      <div className="mt-8">
        <PrivacyAccordion sections={SECTIONS} />
      </div>
      <p className="mt-10 text-xs text-slate-400">
        Cada organismo certificador (suscriptor) puede publicar una política adicional dentro de
        su proceso. En caso de conflicto entre las dos, prevalece la política específica del
        suscriptor responsable del proceso del titular.
      </p>
    </main>
  );
}
