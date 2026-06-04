import Link from "next/link";
import { PrivacyAccordion, type PolicySection } from "@/components/privacy-accordion";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Política de tratamiento de datos personales" };

const APP_NAME = "CIOC";

/// Política de tratamiento de datos personales basada en los avisos
/// oficiales de RISKS INTERNATIONAL S.A.S. publicados en
/// https://www.risksint.com/habeas-data/ y
/// https://www.risksint.com/proteccion-de-datos-personales/ — adaptada al
/// contexto del proceso de evaluación y certificación de personas (Ley
/// 1581 de 2012, Decretos 1377 de 2013 y 1074 de 2015 y normas
/// concordantes en Colombia).

const HABEAS_DATA_EMAIL = "habeasdata@risksint.com";
const HABEAS_WHATSAPP = "+57 300 691 0226";
const HABEAS_PHONE = "+57 601 794 1834";

const SECTIONS: PolicySection[] = [
  {
    id: "responsable",
    title: "1. Responsable del tratamiento",
    body: (
      <>
        <p>
          <strong>{BRAND.legalName}</strong> (en adelante, &laquo;RISKS&raquo;), identificada con
          <strong> NIT 900.352.786-0</strong>, con domicilio en Colombia, es la responsable del
          tratamiento de los datos personales recolectados a través de la plataforma{" "}
          {APP_NAME} y de cualquier canal asociado al proceso de evaluación y certificación de
          personas.
        </p>
        <p>
          <strong>Oficial de Protección de Datos.</strong> Para ejercer cualquier derecho o
          presentar peticiones, quejas y reclamos relacionados con el tratamiento de sus datos
          personales, comuníquese con el área de Habeas Data:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Correo electrónico:</strong>{" "}
            <a className="text-brand-700 underline" href={`mailto:${HABEAS_DATA_EMAIL}`}>
              {HABEAS_DATA_EMAIL}
            </a>
          </li>
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a className="text-brand-700 underline" href={`https://wa.me/${HABEAS_WHATSAPP.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
              {HABEAS_WHATSAPP}
            </a>
          </li>
          <li>
            <strong>Teléfono general:</strong>{" "}
            <a className="text-brand-700 underline" href={`tel:${HABEAS_PHONE.replace(/[^0-9+]/g, "")}`}>
              {HABEAS_PHONE}
            </a>
          </li>
        </ul>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          <strong>Ejerza su derecho de Habeas Data.</strong> Es su derecho y es totalmente
          gratuito.
        </p>
      </>
    ),
  },
  {
    id: "marco-legal",
    title: "2. Marco legal aplicable",
    body: (
      <>
        <p>La presente política se fundamenta en el siguiente marco normativo colombiano:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Constitución Política de Colombia, artículo 15 (Habeas Data).</li>
          <li>Ley 1266 de 2008 — datos financieros y crediticios.</li>
          <li><strong>Ley 1581 de 2012</strong> — régimen general de protección de datos personales.</li>
          <li><strong>Decreto 1377 de 2013</strong> — autorización del titular y políticas de tratamiento.</li>
          <li><strong>Decreto 1074 de 2015</strong> — único reglamentario del sector comercio (Capítulo 25).</li>
          <li>Circular Externa 002 de 2015 y demás conceptos de la Superintendencia de Industria y Comercio (SIC).</li>
          <li>Norma <strong>ISO/IEC 17024</strong> — requisitos para organismos que certifican personas.</li>
          <li>Demás normas concordantes y aquellas que las modifiquen o complementen.</li>
        </ul>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "3. Finalidades del tratamiento",
    body: (
      <>
        <p>
          RISKS trata los datos personales recolectados a través de la plataforma {APP_NAME} y
          de sus canales comerciales para las siguientes finalidades:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Gestión comercial</strong> de clientes, prospectos y contrapartes.</li>
          <li>Prestación de <strong>servicios digitales mediante plataforma web</strong>, incluyendo {APP_NAME}.</li>
          <li>Prospección y contacto comercial.</li>
          <li>Atención de requerimientos, soporte técnico y PQR.</li>
          <li>
            <strong>Finalidad principal:</strong> &laquo;prevención, detección, monitoreo y
            control del lavado de activos y la financiación del terrorismo&raquo;.
          </li>
          <li>Gestión del proceso de evaluación y certificación de competencias de personas (ISO/IEC 17024).</li>
          <li>Verificación de la información y los documentos aportados por el candidato.</li>
          <li>Emisión y verificación pública de certificados con código QR.</li>
          <li>
            Conservación de evidencias para auditoría interna, externa y acreditación
            (<strong>mínimo 5 años</strong>).
          </li>
          <li>Comunicaciones, notificaciones y recordatorios relacionados con el proceso.</li>
          <li>Atender requerimientos de autoridades de control y supervisión.</li>
          <li>Envío de comunicaciones comerciales (solo con autorización expresa del titular).</li>
        </ul>
      </>
    ),
  },
  {
    id: "datos-tratados",
    title: "4. Datos personales tratados",
    body: (
      <>
        <p>Durante el ciclo de vida del titular en la plataforma se pueden tratar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Datos personales básicos:</strong> nombres, apellidos, tipo y número de
            documento, fecha de nacimiento, nacionalidad, dirección, ciudad, país.
          </li>
          <li>
            <strong>Datos de contacto:</strong> correo electrónico (principal y alternos),
            teléfono fijo y móvil.
          </li>
          <li>Datos académicos y profesionales aportados como evidencia.</li>
          <li>
            <strong>Datos sensibles:</strong> orientación política, religión, salud, datos
            biométricos (huellas, fotografía, video). Estos datos solo se tratan con
            autorización expresa e informada del titular y cuentan con un nivel reforzado
            de protección.
          </li>
          <li>
            <strong>Datos biométricos</strong> y evidencias multimedia (fotografía, audio,
            video) cuando sean necesarios para verificación de identidad o para sustentar la
            presentación de la evaluación.
          </li>
          <li>
            <strong>Información de videovigilancia y control de acceso</strong> en eventos
            presenciales.
          </li>
          <li>Evidencias de pago: comprobantes, referencias, sin almacenar números completos de tarjeta.</li>
          <li>Datos técnicos: dirección IP, tipo de dispositivo, navegador, hora de conexión y logs de actividad.</li>
          <li>Resultados de evaluaciones, calificaciones, eventos antifraude y registros del proceso.</li>
        </ul>
      </>
    ),
  },
  {
    id: "datos-sensibles",
    title: "5. Protección reforzada de datos sensibles",
    body: (
      <>
        <p>
          De conformidad con el Decreto 1377 de 2013, &laquo;se prohíbe el tratamiento de datos
          sensibles sin autorización previa, expresa e informada del titular&raquo;. RISKS
          garantiza un <strong>nivel de protección reforzado</strong> mediante:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Estándares técnicos, administrativos y organizacionales específicos.</li>
          <li>
            Principio de <strong>libertad reforzada</strong>: el titular puede negarse a
            entregar datos sensibles sin que ello implique pérdida del servicio.
          </li>
          <li>
            Carácter <strong>facultativo</strong> del suministro de datos sensibles, salvo
            cuando la ley lo exija expresamente.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "autorizacion",
    title: "6. Autorización del titular",
    body: (
      <>
        <p>
          Al marcar la casilla de autorización al momento del registro, el titular declara que
          ha leído esta política y autoriza a {BRAND.shortName} a tratar sus datos para las
          finalidades descritas. La plataforma conserva como evidencia digital del
          consentimiento la fecha, hora, dirección IP, versión de la política y finalidades
          aceptadas.
        </p>
        <p>
          La autorización puede ser revocada en cualquier momento siguiendo el procedimiento
          establecido más adelante, salvo cuando exista un deber legal o contractual que
          obligue a conservar los datos (por ejemplo, conservación de evidencias de evaluación
          por el plazo definido por la acreditación).
        </p>
      </>
    ),
  },
  {
    id: "derechos",
    title: "7. Derechos del titular",
    body: (
      <>
        <p>Conforme al artículo 8° de la Ley 1581 de 2012, el titular tiene derecho a:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Conocer, actualizar y rectificar</strong> sus datos personales y, en
            particular, aquellos que resulten parciales, inexactos, incompletos, fraccionados,
            que induzcan a error o cuyo tratamiento esté prohibido o no haya sido autorizado.
          </li>
          <li><strong>Solicitar prueba</strong> de la autorización otorgada al responsable.</li>
          <li>
            <strong>Ser informado</strong>, previa solicitud, respecto del uso que se le ha
            dado a sus datos personales.
          </li>
          <li>
            <strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio
            por infracciones a lo dispuesto en la ley.
          </li>
          <li>
            <strong>Revocar la autorización</strong> y/o solicitar la supresión de los datos
            cuando proceda.
          </li>
          <li>
            <strong>Acceder de forma gratuita</strong> a los datos personales que hayan sido
            objeto de tratamiento.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "procedimiento",
    title: "8. Procedimiento PQRS (consultas, peticiones y reclamos)",
    body: (
      <>
        <p>
          Para ejercer cualquiera de los derechos anteriores, el titular puede seguir cinco
          pasos sencillos:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Diligencie el formulario</strong> de solicitud disponible en línea o envíe
            su petición al correo{" "}
            <a className="text-brand-700 underline" href={`mailto:${HABEAS_DATA_EMAIL}`}>
              {HABEAS_DATA_EMAIL}
            </a>{" "}
            (totalmente gratuito).
          </li>
          <li>
            <strong>Espere respuesta</strong> del equipo de protección de datos por el medio
            indicado.
          </li>
          <li>
            <strong>Proporcione información adicional</strong> si la solicitud así lo requiere.
          </li>
          <li>
            <strong>Manténgase atento</strong> a las comunicaciones que le enviemos por correo
            electrónico.
          </li>
          <li>
            <strong>Contáctenos</strong> adicionalmente vía WhatsApp ({HABEAS_WHATSAPP}) o
            teléfono ({HABEAS_PHONE}) si necesita apoyo o seguimiento.
          </li>
        </ol>
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-200">
          <strong>Plazo de respuesta:</strong> máximo <strong>15 días hábiles</strong>{" "}
          contados desde la recepción de la solicitud. Si no es posible atender la solicitud
          en ese plazo, se informará al interesado, antes del vencimiento, los motivos de la
          demora y la fecha en que se atenderá su solicitud, la cual en ningún caso podrá
          superar los <strong>5 días hábiles</strong> adicionales.
        </p>
      </>
    ),
  },
  {
    id: "requisitos",
    title: "9. Requisitos mínimos de la solicitud",
    body: (
      <>
        <p>Toda solicitud, queja o reclamo debe contener al menos:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nombre completo y número de identificación del titular.</li>
          <li>
            Petición clara y específica (consulta, actualización, rectificación, supresión o
            revocatoria de autorización).
          </li>
          <li>Justificación o motivos, cuando sea necesario para entender el alcance.</li>
          <li>Pruebas o documentos de apoyo, si aplica.</li>
          <li>Dirección postal o correo electrónico para enviar la respuesta.</li>
          <li>Firma o nombre completo del titular o de su representante.</li>
        </ul>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "10. Transferencia y transmisión de datos",
    body: (
      <>
        <p>
          {BRAND.shortName} puede transmitir datos a encargados que prestan servicios
          necesarios para la operación de la plataforma (hosting, correo transaccional,
          pasarelas de pago, almacenamiento en la nube). En todos los casos, se exige a estos
          encargados garantías equivalentes de confidencialidad, integridad y disponibilidad.
        </p>
        <p>
          No se transfieren datos a países sin nivel adecuado de protección sin la
          autorización previa del titular, salvo en los casos legalmente permitidos
          (artículo 26 de la Ley 1581 de 2012).
        </p>
      </>
    ),
  },
  {
    id: "conservacion",
    title: "11. Tiempo de conservación",
    body: (
      <p>
        Los datos asociados a un proceso de evaluación y certificación se conservan por un
        mínimo de <strong>5 años</strong> como evidencia obligatoria para auditoría y
        acreditación bajo la norma ISO/IEC 17024, contados desde la fecha de emisión o de la
        última actualización del registro. Cumplido el plazo y resueltas las obligaciones
        legales y contractuales, los datos son anonimizados o suprimidos.
      </p>
    ),
  },
  {
    id: "seguridad",
    title: "12. Medidas de seguridad",
    body: (
      <>
        <p>
          La plataforma implementa controles técnicos, administrativos y organizacionales para
          preservar la confidencialidad, integridad y disponibilidad de la información:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Cifrado en tránsito (TLS) y en reposo del almacenamiento de objetos.</li>
          <li>Hash de contraseñas con algoritmos resistentes (bcrypt).</li>
          <li>Sesiones revocables, control de acceso por roles y permisos.</li>
          <li>Registro de auditoría detallado (actor, acción, IP, agente de usuario).</li>
          <li>Backups, monitoreo continuo y endurecimiento de cabeceras HTTP.</li>
          <li>
            Aplicación interna del Manual de Tratamiento de Datos Personales (MGE-004), la
            Política de Seguridad de la Información (OGE-023) y el Manual de Gestión de
            Solicitudes de Titulares (MCM-002).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "documentos",
    title: "13. Documentos internos asociados",
    body: (
      <>
        <p>
          RISKS mantiene un conjunto de documentos formales de gestión de protección de datos
          personales, cuyas versiones vigentes se relacionan a continuación:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>MGE-004</strong> — Manual de Tratamiento de Datos Personales.</li>
          <li><strong>OGE-023</strong> — Política de Seguridad de la Información (V.2).</li>
          <li><strong>MCM-001</strong> — Manual de procedimientos para inclusión de reportes (SISCOM-SIRIEST).</li>
          <li><strong>MCM-002</strong> — Manual de gestión y traslado de solicitudes de titulares de datos.</li>
          <li><strong>FCM-014</strong> — Autorización para tratamiento de datos sensibles.</li>
          <li><strong>TLG-001</strong> — Mecanismo implementado para obtener autorizaciones.</li>
          <li><strong>MGE-006</strong> — Manual interno de políticas y procedimientos (versión vigente).</li>
        </ul>
        <p className="text-xs text-slate-500">
          Estos documentos están disponibles para los titulares de datos previa solicitud al
          correo del oficial de protección de datos.
        </p>
      </>
    ),
  },
  {
    id: "exclusiones",
    title: "14. Exclusiones legales",
    body: (
      <p>
        De acuerdo con el artículo 2°, literal b), de la Ley 1581 de 2012, algunos servicios
        de naturaleza pública destinados a la prevención del lavado de activos y la
        financiación del terrorismo se encuentran excluidos del alcance de dicha ley. RISKS
        opera estos servicios bajo el régimen normativo específico que les resulta aplicable.
      </p>
    ),
  },
  {
    id: "menores",
    title: "15. Tratamiento de datos de menores de edad",
    body: (
      <p>
        El servicio está dirigido a personas mayores de 18 años. En caso de tratarse datos de
        menores de edad para procesos especiales, se requerirá la autorización previa y
        expresa de quien ejerza la representación legal, dando prevalencia al interés superior
        del menor.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "16. Cookies y tecnologías similares",
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
    title: "17. Vigencia y actualizaciones",
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
    title: "18. Contacto",
    body: (
      <>
        <p>
          Para ejercer cualquier derecho o presentar peticiones, quejas y reclamos relacionados
          con el tratamiento de sus datos personales:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Responsable:</strong> {BRAND.legalName} · NIT 900.352.786-0</li>
          <li>
            <strong>Oficial de Protección de Datos:</strong>{" "}
            <a className="text-brand-700 underline" href={`mailto:${HABEAS_DATA_EMAIL}`}>
              {HABEAS_DATA_EMAIL}
            </a>
          </li>
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a className="text-brand-700 underline" href={`https://wa.me/${HABEAS_WHATSAPP.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
              {HABEAS_WHATSAPP}
            </a>
          </li>
          <li>
            <strong>Teléfono general:</strong>{" "}
            <a className="text-brand-700 underline" href={`tel:${HABEAS_PHONE.replace(/[^0-9+]/g, "")}`}>
              {HABEAS_PHONE}
            </a>
          </li>
          <li>
            <strong>Autoridad de control:</strong> Superintendencia de Industria y Comercio —{" "}
            <a className="text-brand-700 underline" href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">
              www.sic.gov.co
            </a>
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Consulte también nuestras políticas oficiales publicadas en{" "}
          <a className="text-brand-700 underline" href="https://www.risksint.com/habeas-data/" target="_blank" rel="noopener noreferrer">
            risksint.com/habeas-data
          </a>{" "}
          y{" "}
          <a className="text-brand-700 underline" href="https://www.risksint.com/proteccion-de-datos-personales/" target="_blank" rel="noopener noreferrer">
            risksint.com/proteccion-de-datos-personales
          </a>.
        </p>
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
          {" "}{APP_NAME} y de sus canales de atención, y se complementa con las políticas
          oficiales publicadas en{" "}
          <a className="text-brand-700 underline" href="https://www.risksint.com/habeas-data/" target="_blank" rel="noopener noreferrer">
            risksint.com/habeas-data
          </a>{" "}
          y{" "}
          <a className="text-brand-700 underline" href="https://www.risksint.com/proteccion-de-datos-personales/" target="_blank" rel="noopener noreferrer">
            risksint.com/proteccion-de-datos-personales
          </a>.
        </p>
      </header>

      {/* Tarjeta de contacto rápido del oficial de protección de datos:
          la información más buscada por los titulares debe estar visible
          sin necesidad de abrir el acordeón. */}
      <section className="mt-6 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:grid-cols-3">
        <a
          href={`mailto:${HABEAS_DATA_EMAIL}`}
          className="flex items-start gap-2 rounded-lg bg-white p-3 ring-1 ring-amber-200 hover:ring-amber-400"
        >
          <span aria-hidden className="text-xl">📧</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Correo Habeas Data</div>
            <div className="text-sm font-semibold text-slate-800">{HABEAS_DATA_EMAIL}</div>
          </div>
        </a>
        <a
          href={`https://wa.me/${HABEAS_WHATSAPP.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 rounded-lg bg-white p-3 ring-1 ring-amber-200 hover:ring-amber-400"
        >
          <span aria-hidden className="text-xl">💬</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">WhatsApp</div>
            <div className="text-sm font-semibold text-slate-800">{HABEAS_WHATSAPP}</div>
          </div>
        </a>
        <a
          href={`tel:${HABEAS_PHONE.replace(/[^0-9+]/g, "")}`}
          className="flex items-start gap-2 rounded-lg bg-white p-3 ring-1 ring-amber-200 hover:ring-amber-400"
        >
          <span aria-hidden className="text-xl">📞</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Teléfono general</div>
            <div className="text-sm font-semibold text-slate-800">{HABEAS_PHONE}</div>
          </div>
        </a>
      </section>

      <div className="mt-8">
        <PrivacyAccordion sections={SECTIONS} />
      </div>
      <p className="mt-10 text-xs text-slate-400">
        Cada organismo certificador (suscriptor) puede publicar una política adicional dentro
        de su proceso. En caso de conflicto entre ambas, prevalece la política específica del
        suscriptor responsable del proceso del titular.
      </p>
    </main>
  );
}
