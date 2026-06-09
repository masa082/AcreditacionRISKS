/**
 * Generador de documentos legales con el mismo estilo visual del
 * Documento Descriptivo CIOC: tipografía Inter + Figtree (la misma de
 * risksint.com), paleta navy + grises (sin dorado), logos RISKS y ONAC
 * en portada y franja de marca.
 *
 * Produce 2 documentos × 2 formatos = 4 archivos en public/docs/:
 *   - Politica-Tratamiento-Datos.pdf | .docx
 *   - Terminos-Condiciones-Acreditacion.pdf | .docx
 *
 * Ejecutar:  node docs/build-legal.cjs
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = path.join(__dirname, "..", "public", "docs");

// ─── Assets de marca embebidos ────────────────────────────────────────
const ASSETS = path.join(__dirname, "assets");
const b64 = (file) => fs.readFileSync(path.join(ASSETS, file)).toString("base64");
const LOGO_RISKS = `data:image/png;base64,${b64("risks-logo.png")}`;
const ONAC_LOGO = `data:image/png;base64,${fs
  .readFileSync(path.join(__dirname, "..", "public", "onac-logo.png"))
  .toString("base64")}`;
const FONT_INTER = `data:font/woff2;base64,${b64("Inter-Variable.woff2")}`;
const FONT_FIGTREE = `data:font/woff2;base64,${b64("Figtree-Variable.woff2")}`;

// ─── CSS común a todos los documentos ─────────────────────────────────
// Reusado y ligeramente simplificado del CIOC. Paleta sin dorado.
const SHARED_CSS = `
  @font-face {
    font-family: 'Inter';
    font-style: normal; font-weight: 100 900; font-display: block;
    src: url('${FONT_INTER}') format('woff2');
  }
  @font-face {
    font-family: 'Figtree';
    font-style: normal; font-weight: 300 900; font-display: block;
    src: url('${FONT_FIGTREE}') format('woff2');
  }
  :root {
    --navy-900: #0B1F3A; --navy-800: #1E3A5F;
    --navy-50:  #EAF0F6;
    --slate-700:#334155; --slate-500:#64748B;
    --slate-300:#CBD5E1; --slate-200:#E2E8F0; --slate-100:#F1F5F9;
  }
  @page {
    size: Letter;
    margin: 24mm 18mm 24mm 18mm;
    @top-left {
      content: "RISKS INTERNATIONAL · " counter(page);
      font-family: 'Figtree', sans-serif; font-size: 9pt;
      color: var(--navy-900); font-weight: 700;
    }
    @top-right {
      content: "www.okacreditado.com";
      font-family: 'Inter', sans-serif; font-size: 9pt;
      color: var(--slate-500); font-weight: 500;
    }
    @bottom-center {
      content: "Página " counter(page) " de " counter(pages) "  ·  Documento oficial";
      font-family: 'Inter', sans-serif; font-size: 8.5pt; color: var(--slate-500);
    }
  }
  @page :first {
    @top-left { content: ""; }
    @top-right { content: ""; }
    @bottom-center { content: ""; }
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    color: #1F2937;
    font-family: 'Inter', sans-serif;
    font-size: 10.5pt; line-height: 1.55;
    font-feature-settings: 'cv11', 'ss01', 'ss03';
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  p { text-align: justify; margin: 0 0 10pt 0; }
  h1, h2, h3 {
    font-family: 'Figtree', sans-serif;
    page-break-after: avoid; letter-spacing: -0.2pt;
  }
  h1 {
    font-size: 20pt; color: var(--navy-900);
    margin: 28pt 0 12pt 0;
    border-bottom: 2pt solid var(--navy-900); padding-bottom: 6pt;
  }
  h2 { font-size: 14pt; color: var(--navy-800); margin: 22pt 0 8pt 0; }
  h3 { font-size: 12pt; color: var(--navy-900); margin: 16pt 0 6pt 0; font-weight: 700; }
  ul { margin: 6pt 0 12pt 0; padding-left: 18pt; }
  li { margin: 3pt 0; }
  li::marker { color: var(--navy-900); }

  /* Portada */
  .cover {
    page-break-after: always; text-align: center;
    padding-top: 60pt; height: 95vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
  }
  .cover-top { display: flex; flex-direction: column; align-items: center; }
  .cover-logo { width: 150pt; height: auto; margin-bottom: 18pt; }
  .cover-brand {
    font-family: 'Figtree', sans-serif; font-size: 30pt;
    font-weight: 800; color: var(--navy-900); letter-spacing: -0.4pt;
  }
  .cover-norm {
    margin-top: 6pt; color: var(--navy-900);
    font-weight: 700; font-size: 11pt;
    font-family: 'Figtree', sans-serif;
    letter-spacing: 0.5pt; text-transform: uppercase;
  }
  .cover-bar {
    width: 80pt; height: 3pt; background: var(--navy-900); margin: 22pt 0;
  }
  .cover-title {
    font-family: 'Figtree', sans-serif; font-size: 28pt;
    color: var(--navy-900); font-weight: 800;
    margin-top: 4pt; letter-spacing: -0.5pt;
    max-width: 480pt;
  }
  .cover-sub {
    font-family: 'Inter', sans-serif; color: var(--slate-500);
    font-size: 13pt; margin-top: 10pt; max-width: 480pt; font-weight: 400;
  }
  .cover-bottom { display: flex; flex-direction: column; align-items: center; }
  .cover-platform {
    font-size: 9pt; text-transform: uppercase;
    letter-spacing: 1.5pt; color: var(--slate-500);
    font-family: 'Figtree', sans-serif; font-weight: 600;
  }
  .cover-url {
    font-family: 'Figtree', sans-serif; font-size: 18pt;
    color: var(--navy-900); font-weight: 800;
    margin-top: 4pt; letter-spacing: -0.3pt;
  }
  .cover-meta { margin-top: 18pt; font-size: 9pt; color: var(--slate-500); }
  .cover-onac {
    margin-top: 22pt; display: flex; align-items: center; gap: 14pt;
    padding: 10pt 16pt; background: var(--slate-100); border-radius: 6pt;
  }
  .cover-onac img { width: 70pt; height: auto; }
  .cover-onac .t {
    font-family: 'Figtree', sans-serif; font-size: 8.5pt;
    color: var(--slate-500); text-transform: uppercase;
    letter-spacing: 0.8pt; font-weight: 700;
  }
  .cover-onac .b {
    font-family: 'Figtree', sans-serif; font-size: 10pt;
    color: var(--navy-900); font-weight: 700; margin-top: 2pt;
  }

  /* Franja de marca al inicio del cuerpo */
  .brand-strip {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10pt 14pt; background: var(--navy-50);
    border-radius: 4pt; margin-bottom: 16pt;
    border-left: 4pt solid var(--navy-900);
  }
  .brand-strip .left { display: flex; align-items: center; gap: 12pt; }
  .brand-strip .left img { height: 30pt; width: auto; }
  .brand-strip .left .who {
    font-family: 'Figtree', sans-serif; color: var(--navy-900);
    font-weight: 800; font-size: 12pt; letter-spacing: -0.2pt;
  }
  .brand-strip .left .who small {
    display: block; font-weight: 600; font-size: 8pt; color: var(--slate-500);
    letter-spacing: 0.4pt; text-transform: uppercase; margin-top: 1pt;
  }
  .brand-strip .right { display: flex; align-items: center; gap: 8pt; }
  .brand-strip .right img { height: 26pt; width: auto; }
  .brand-strip .right .label {
    font-family: 'Figtree', sans-serif; font-size: 7.5pt;
    color: var(--slate-500); text-transform: uppercase;
    letter-spacing: 0.6pt; font-weight: 700; text-align: right;
  }
  .brand-strip .right .label strong {
    color: var(--navy-900); font-size: 8pt;
    display: block; margin-top: 1pt;
  }

  /* Callouts y bloques */
  .callout {
    margin: 12pt 0 14pt 0; padding: 12pt 14pt;
    background: var(--slate-100);
    border-left: 4pt solid var(--navy-900);
    border-radius: 2pt; page-break-inside: avoid;
  }
  .callout .t {
    font-weight: bold; color: var(--navy-900);
    margin-bottom: 4pt; font-size: 10.5pt;
  }
  .callout .b { font-size: 10pt; color: #374151; }

  .chip {
    display: inline-block; padding: 1pt 6pt;
    background: var(--navy-50); color: var(--navy-900);
    font-size: 8.5pt; font-weight: bold;
    border-radius: 8pt; letter-spacing: 0.3pt;
  }

  table {
    width: 100%; border-collapse: collapse;
    margin: 8pt 0 14pt 0; font-size: 9.5pt;
    page-break-inside: avoid;
  }
  thead th {
    background: var(--navy-900); color: #fff;
    text-align: left; padding: 6pt 8pt;
    font-weight: bold; font-size: 9pt; letter-spacing: 0.3pt;
  }
  tbody td {
    padding: 6pt 8pt; border-bottom: 1px solid var(--slate-200); vertical-align: top;
  }
  tbody tr:nth-child(odd) td { background: #FAFBFC; }
  td.label { font-weight: bold; color: var(--navy-800); }

  /* Bloque de aceptación (firma/aceptación electrónica) */
  .accept-box {
    margin-top: 24pt; padding: 14pt;
    background: var(--navy-50);
    border: 1pt dashed var(--navy-900);
    border-radius: 4pt;
  }
  .accept-box .t {
    font-family: 'Figtree', sans-serif; font-weight: 800;
    color: var(--navy-900); font-size: 11pt;
    text-transform: uppercase; letter-spacing: 0.4pt;
    margin-bottom: 4pt;
  }
  .accept-box .b { font-size: 10pt; color: var(--slate-700); }

  .toc {
    margin: 0 0 16pt 0; padding: 14pt 18pt;
    background: var(--slate-100);
    border-left: 4pt solid var(--navy-900);
    page-break-after: always;
  }
  .toc h1 { margin-top: 0; border: none; padding: 0; }
  .toc ol { margin: 10pt 0 0 0; padding: 0; list-style: none; }
  .toc ol li {
    margin: 4pt 0; display: flex; justify-content: space-between;
    align-items: baseline; border-bottom: 1px dotted var(--slate-300);
    padding-bottom: 2pt;
  }
  .toc ol li span:first-child { color: var(--navy-900); font-weight: 600; }
`;

// ─── Wrapper HTML ─────────────────────────────────────────────────────
function makeHtml({ title, subtitle, version, sections, toc }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${title} — RISKS INTERNATIONAL</title>
<style>${SHARED_CSS}</style>
</head>
<body>
<section class="cover">
  <div class="cover-top">
    <img class="cover-logo" src="${LOGO_RISKS}" alt="RISKS INTERNATIONAL" />
    <div class="cover-brand">RISKS INTERNATIONAL</div>
    <div class="cover-norm">Organismo de Certificación de Personas · ISO/IEC 17024</div>
  </div>
  <div>
    <div class="cover-bar"></div>
    <div class="cover-title">${title}</div>
    <div class="cover-sub">${subtitle}</div>
    <div class="cover-bar"></div>
  </div>
  <div class="cover-bottom">
    <div class="cover-platform">Plataforma</div>
    <div class="cover-url">www.okacreditado.com</div>
    <div class="cover-meta">${version} · Bogotá D.C., Colombia · Junio de 2026</div>
    <div class="cover-onac">
      <img src="${ONAC_LOGO}" alt="ONAC" />
      <div>
        <div class="t">Respaldo institucional</div>
        <div class="b">En proceso de acreditación ante ONAC</div>
      </div>
    </div>
  </div>
</section>

<section class="toc">
  <h1>Contenido</h1>
  <ol>
    ${toc.map((t, i) => `<li><span>${i + 1}. ${t.title}</span><span>${t.page}</span></li>`).join("\n    ")}
  </ol>
</section>

<div class="brand-strip">
  <div class="left">
    <img src="${LOGO_RISKS}" alt="RISKS INTERNATIONAL" />
    <div class="who">
      RISKS INTERNATIONAL S.A.S.
      <small>Organismo de Certificación de Personas · ISO/IEC 17024</small>
    </div>
  </div>
  <div class="right">
    <div class="label">Respaldo<strong>ONAC · en acreditación</strong></div>
    <img src="${ONAC_LOGO}" alt="ONAC" />
  </div>
</div>

${sections}
</body>
</html>`;
}

// ─── Contenido del Documento 1: POLÍTICA DE TRATAMIENTO DE DATOS ──────
const HABEAS_TOC = [
  { title: "Identificación del responsable", page: 3 },
  { title: "Marco legal aplicable", page: 3 },
  { title: "Datos personales tratados", page: 4 },
  { title: "Finalidades del tratamiento", page: 4 },
  { title: "Derechos del titular", page: 5 },
  { title: "Canales de atención", page: 6 },
  { title: "Procedimiento para ejercer derechos", page: 6 },
  { title: "Transferencias y transmisiones", page: 7 },
  { title: "Conservación de los datos", page: 7 },
  { title: "Seguridad de la información", page: 8 },
  { title: "Vigencia y modificaciones", page: 8 },
  { title: "Aceptación", page: 8 },
];

const HABEAS_BODY = `
<h1>1. Identificación del responsable</h1>
<p>
  <strong>RISKS INTERNATIONAL S.A.S.</strong>, sociedad legalmente constituida bajo
  las leyes de la República de Colombia, identificada con NIT 900.352.786-5 y con
  domicilio principal en la ciudad de Bogotá D.C., actúa como
  <strong>Responsable del Tratamiento</strong> de los datos personales que recopila
  a través de la plataforma <strong>okacreditado.com</strong>.
</p>
<ul>
  <li><strong>Dirección de notificaciones:</strong> Bogotá D.C., Colombia.</li>
  <li><strong>Correo para asuntos de habeas data:</strong> habeasdata@risksint.com</li>
  <li><strong>Correos institucionales:</strong> gerencia@risksint.com · formacion@risksint.com</li>
  <li><strong>Sitio web:</strong> www.okacreditado.com · www.risksint.com</li>
</ul>

<h1>2. Marco legal aplicable</h1>
<p>
  La presente Política de Tratamiento de Datos Personales se desarrolla en cumplimiento
  de las siguientes normas:
</p>
<ul>
  <li><strong>Ley 1581 de 2012</strong> — Régimen general de protección de datos personales en Colombia.</li>
  <li><strong>Decreto 1377 de 2013</strong> — Reglamentario parcial de la Ley 1581.</li>
  <li><strong>Decreto 1074 de 2015</strong> — Único Reglamentario del Sector Comercio, Industria y Turismo.</li>
  <li><strong>Circulares y conceptos</strong> emitidos por la Superintendencia de Industria y Comercio (SIC).</li>
  <li><strong>ISO/IEC 17024</strong> en lo aplicable al manejo de información de candidatos y certificados emitidos.</li>
</ul>

<h1>3. Datos personales tratados</h1>
<p>
  Para la operación del proceso de certificación de personas, la plataforma recopila
  y trata las siguientes categorías de información del candidato:
</p>
<table>
  <thead>
    <tr><th>Categoría</th><th>Datos específicos</th></tr>
  </thead>
  <tbody>
    <tr><td class="label">Identificación</td><td>Nombres, apellidos, tipo y número de documento, fecha de expedición.</td></tr>
    <tr><td class="label">Contacto</td><td>Correo(s) electrónico(s), teléfono(s), dirección de residencia, país, departamento y municipio.</td></tr>
    <tr><td class="label">Académicos y laborales</td><td>Hoja de vida, formación académica, experiencia profesional, certificaciones previas.</td></tr>
    <tr><td class="label">Imagen</td><td>Fotografía a color cargada por el candidato (uso exclusivo en el certificado y el portal).</td></tr>
    <tr><td class="label">Soportes documentales</td><td>Copia del documento de identidad, certificados laborales, diplomas.</td></tr>
    <tr><td class="label">De la evaluación</td><td>Respuestas, archivos cargados, marcas de tiempo, IP, registros de monitoreo antifraude.</td></tr>
    <tr><td class="label">Financieros</td><td>Datos asociados al pago de la inscripción (mediante pasarelas certificadas como Rapyd; RISKS no almacena datos completos de tarjetas).</td></tr>
    <tr><td class="label">Técnicos</td><td>IP, User-Agent, cookies funcionales (incluida la cookie de idioma <span class="chip">app-locale</span>).</td></tr>
  </tbody>
</table>

<h1>4. Finalidades del tratamiento</h1>
<p>Los datos del titular se tratan únicamente para las siguientes finalidades:</p>
<ul>
  <li>Crear y administrar la cuenta del candidato en la plataforma.</li>
  <li>Gestionar el ciclo completo del proceso de certificación (registro, documentos, pago, agenda, evaluación, calificación, comité, emisión).</li>
  <li>Emitir, custodiar y verificar públicamente los certificados expedidos.</li>
  <li>Permitir la consulta pública de autenticidad mediante código y QR en la URL <span class="chip">okacreditado.com/verificar/{código}</span>.</li>
  <li>Enviar comunicaciones operativas (avisos de proceso, recordatorios de vencimiento 90/60/30 días).</li>
  <li>Enviar comunicaciones comerciales y de recertificación, siempre que el titular lo haya autorizado y con derecho permanente de oposición.</li>
  <li>Atender requerimientos judiciales, administrativos o de organismos de control.</li>
  <li>Mantener evidencia de auditoría requerida por la norma ISO/IEC 17024 y por el proceso de acreditación ante ONAC.</li>
  <li>Mejorar y asegurar la plataforma (analítica funcional, monitoreo de fraude y seguridad).</li>
</ul>
<div class="callout">
  <div class="t">Sobre la fotografía y el certificado emitido</div>
  <div class="b">
    La fotografía cargada por el candidato se utiliza exclusivamente para la
    personalización visual del certificado, su carnetización digital y la
    identificación del titular en el portal. No se comparte con terceros distintos
    al organismo certificador.
  </div>
</div>

<h1>5. Derechos del titular</h1>
<p>De acuerdo con el artículo 8 de la Ley 1581 de 2012, el titular tiene derecho a:</p>
<ul>
  <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales.</li>
  <li><strong>Solicitar prueba</strong> de la autorización otorgada, salvo cuando la ley exceptúe.</li>
  <li><strong>Ser informado</strong> del uso que se le ha dado a sus datos personales.</li>
  <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC).</li>
  <li><strong>Revocar la autorización y/o solicitar la supresión</strong> del dato, cuando no exista un deber legal o contractual de conservarlo.</li>
  <li><strong>Acceder en forma gratuita</strong> a sus datos personales que hayan sido objeto de tratamiento.</li>
</ul>

<h1>6. Canales de atención</h1>
<p>
  El titular puede ejercer sus derechos a través de cualquiera de los siguientes
  canales oficiales de RISKS INTERNATIONAL:
</p>
<ul>
  <li><strong>Correo electrónico:</strong> habeasdata@risksint.com (canal oficial para ejercer derechos de habeas data), con copia opcional a gerencia@risksint.com.</li>
  <li><strong>Portal del candidato:</strong> sección “Mi perfil” → edición de datos personales y solicitudes/apelaciones.</li>
  <li><strong>Sitio web público:</strong> formulario de contacto en <strong>okacreditado.com/contacto</strong>.</li>
</ul>

<h1>7. Procedimiento para ejercer derechos</h1>
<p>
  Las consultas y reclamos serán atendidos en los siguientes plazos máximos contados a
  partir de la fecha de recibo de la solicitud:
</p>
<table>
  <thead><tr><th>Tipo de solicitud</th><th>Plazo máximo</th><th>Prórroga máxima</th></tr></thead>
  <tbody>
    <tr><td class="label">Consultas (art. 14 Ley 1581)</td><td>10 días hábiles</td><td>5 días hábiles</td></tr>
    <tr><td class="label">Reclamos (art. 15 Ley 1581)</td><td>15 días hábiles</td><td>8 días hábiles</td></tr>
    <tr><td class="label">Solicitudes de supresión / revocatoria</td><td>15 días hábiles</td><td>8 días hábiles</td></tr>
  </tbody>
</table>
<p>
  Cuando no fuere posible atender la solicitud dentro de los plazos indicados, se
  informará al interesado los motivos de la demora y la fecha en que se atenderá.
</p>

<h1>8. Transferencias y transmisiones</h1>
<p>
  RISKS INTERNATIONAL podrá transmitir datos personales a los siguientes encargados,
  exclusivamente para las finalidades autorizadas:
</p>
<ul>
  <li><strong>Vercel Inc.</strong> — proveedor de hosting frontend (EE.UU., con cláusulas estándar de protección).</li>
  <li><strong>Railway Corporation</strong> — base de datos y almacenamiento de archivos (EE.UU., URLs firmadas SHA-256).</li>
  <li><strong>Rapyd Financial Network</strong> — procesamiento de pagos en línea (cuando el candidato elige esta opción).</li>
  <li><strong>Resend Inc.</strong> — envío de correo transaccional.</li>
  <li><strong>Organismo Nacional de Acreditación de Colombia (ONAC)</strong> — para fines de acreditación y auditoría, cuando lo requiera el proceso.</li>
  <li><strong>Autoridades</strong> en el cumplimiento de obligaciones legales o requerimientos judiciales.</li>
</ul>
<div class="callout">
  <div class="t">Transferencia internacional</div>
  <div class="b">
    La plataforma opera servicios en jurisdicciones distintas a Colombia (EE.UU.,
    principalmente). El titular autoriza expresamente la transferencia internacional
    bajo las garantías equivalentes a las exigidas por la Ley 1581.
  </div>
</div>

<h1>9. Conservación de los datos</h1>
<p>
  Los datos personales se conservarán por el tiempo necesario para cumplir las
  finalidades del tratamiento y las obligaciones legales y de auditoría, con los
  siguientes mínimos:
</p>
<ul>
  <li><strong>Datos del candidato y soportes:</strong> mientras la relación esté vigente y por un plazo adicional de cinco (5) años posteriores a la cancelación o vencimiento del proceso, salvo plazo mayor por norma especial.</li>
  <li><strong>Certificados emitidos:</strong> conservación permanente para garantizar la verificación pública mientras el dominio okacreditado.com esté operativo.</li>
  <li><strong>Evidencias de la evaluación:</strong> mínimo cinco (5) años a efectos de auditoría ONAC.</li>
  <li><strong>Registros del consentimiento (Habeas Data):</strong> mientras subsista la relación y al menos por el término exigido por la ley.</li>
</ul>

<h1>10. Seguridad de la información</h1>
<p>
  RISKS INTERNATIONAL aplica medidas técnicas y organizativas razonables para proteger
  los datos personales contra la pérdida, el acceso no autorizado, la alteración o la
  divulgación indebida. Entre otras:
</p>
<ul>
  <li>Almacenamiento en object storage S3 con URLs firmadas SHA-256 y vencimiento corto.</li>
  <li>Aislamiento multitenant a nivel de fila (Row Level Security) con filtro por suscriptor.</li>
  <li>Cifrado en tránsito (HTTPS/TLS) y en reposo (cifrado del proveedor de base de datos).</li>
  <li>Headers de hardening (CSP, HSTS, X-Frame-Options).</li>
  <li>Registro de auditoría con IP, User-Agent y hash SHA-256 del consentimiento.</li>
  <li>Antifraude en la evaluación: marca de agua personalizada, anti-screenshot, control de tiempo por pregunta, registro de pérdida de foco del navegador.</li>
  <li>Política de gestión de claves: las API keys de proveedores (Resend, Rapyd, Railway) jamás se exponen en cliente; el panel de diagnóstico únicamente muestra el prefijo.</li>
</ul>

<h1>11. Vigencia y modificaciones</h1>
<p>
  La presente Política rige a partir de su publicación. Cualquier modificación sustancial
  será comunicada al titular por los canales registrados con una antelación razonable a
  su entrada en vigor. La versión vigente siempre estará disponible en
  <strong>okacreditado.com/documentacion</strong>.
</p>

<h1>12. Aceptación</h1>
<div class="accept-box">
  <div class="t">Constancia electrónica</div>
  <div class="b">
    Al marcar la casilla “Acepto la política de tratamiento de datos” en el formulario
    de registro y al pulsar “Crear cuenta”, el titular manifiesta haber leído, entendido
    y aceptado libremente esta Política. El sistema genera un PDF firmado con la
    autorización y lo envía al correo del titular, conservando como evidencia el hash
    SHA-256 del snapshot, la dirección IP, el User-Agent y la fecha/hora UTC.
  </div>
</div>
`;

// ─── Contenido del Documento 2: TÉRMINOS Y CONDICIONES ────────────────
const TERMS_TOC = [
  { title: "Objeto y aceptación", page: 3 },
  { title: "Definiciones", page: 3 },
  { title: "Alcance de la acreditación", page: 4 },
  { title: "Esquemas de certificación", page: 4 },
  { title: "Requisitos del candidato", page: 5 },
  { title: "Proceso de certificación", page: 5 },
  { title: "Tarifas, pagos y reembolsos", page: 6 },
  { title: "Vigencia, suspensión y revocación", page: 7 },
  { title: "Recertificación", page: 7 },
  { title: "Verificación pública", page: 8 },
  { title: "Apelaciones y quejas", page: 8 },
  { title: "Imparcialidad y confidencialidad", page: 9 },
  { title: "Limitación de responsabilidad", page: 9 },
  { title: "Modificaciones y ley aplicable", page: 10 },
  { title: "Aceptación", page: 10 },
];

const TERMS_BODY = `
<h1>1. Objeto y aceptación</h1>
<p>
  Los presentes Términos y Condiciones regulan la relación entre
  <strong>RISKS INTERNATIONAL S.A.S.</strong> (en adelante, “el Organismo
  Certificador” o “RISKS”) y las personas naturales que se inscriben en alguno de los
  esquemas de certificación de competencias profesionales operados a través de la
  plataforma <strong>okacreditado.com</strong>.
</p>
<p>
  La inscripción del candidato, el pago de la tarifa y la aceptación expresa de este
  documento constituyen un acuerdo vinculante entre las partes y un contrato
  electrónico válido en los términos del artículo 14 de la Ley 527 de 1999.
</p>

<h1>2. Definiciones</h1>
<ul>
  <li><strong>Candidato:</strong> persona natural que solicita la certificación.</li>
  <li><strong>Certificado:</strong> documento que acredita formalmente que el titular cumple las competencias del esquema, emitido por RISKS bajo la norma ISO/IEC 17024.</li>
  <li><strong>Esquema de certificación:</strong> conjunto de requisitos, contenidos, modalidades de evaluación y criterios de aprobación de un programa específico (por ejemplo: CIOC SARLAFT).</li>
  <li><strong>Comité evaluador:</strong> grupo interdisciplinario que revisa los casos prácticos y resuelve apelaciones.</li>
  <li><strong>ONAC:</strong> Organismo Nacional de Acreditación de Colombia.</li>
  <li><strong>Plataforma:</strong> okacreditado.com y sus subdominios.</li>
</ul>

<h1>3. Alcance de la acreditación</h1>
<p>
  RISKS opera como Organismo de Certificación de Personas bajo la norma
  <span class="chip">ISO/IEC 17024</span>. A la fecha de publicación de este documento,
  RISKS se encuentra en proceso de acreditación formal ante ONAC. En consecuencia, los
  certificados emitidos llevan la leyenda <em>“en proceso de acreditación”</em> hasta
  que la acreditación se haga efectiva.
</p>
<div class="callout">
  <div class="t">Sobre el alcance del documento emitido</div>
  <div class="b">
    El certificado emitido por RISKS constituye una declaración formal de competencia
    profesional. No reemplaza títulos académicos, licencias profesionales otorgadas por
    autoridades competentes ni inscripciones en registros gremiales o estatales.
  </div>
</div>

<h1>4. Esquemas de certificación</h1>
<p>
  La oferta de esquemas vigentes está publicada en <strong>okacreditado.com/certificaciones</strong>.
  Cada esquema define:
</p>
<ul>
  <li>Perfil profesional al que aplica.</li>
  <li>Evaluaciones que lo componen (examen teórico, caso práctico).</li>
  <li>Modalidad (presencial, en línea o híbrida) y duración por evaluación.</li>
  <li>Puntaje mínimo de aprobación por evaluación.</li>
  <li>Número de intentos permitidos y reglas de reintento.</li>
  <li>Vigencia del certificado (3 años por defecto, salvo definición distinta del esquema).</li>
  <li>Tarifa total más IVA, condiciones de pago y soportes documentales requeridos.</li>
</ul>

<h1>5. Requisitos del candidato</h1>
<p>El candidato declara y garantiza que:</p>
<ul>
  <li>Es persona mayor de edad y plenamente capaz.</li>
  <li>Los datos suministrados son veraces, completos y actualizados.</li>
  <li>Los soportes cargados (hoja de vida, documento de identidad, fotografía, certificados) son auténticos y de su titularidad.</li>
  <li>Cuenta con conexión a internet estable, cámara y micrófono para las evaluaciones en línea con monitoreo.</li>
  <li>Acepta las reglas de integridad del examen y se compromete a no incurrir en conductas fraudulentas.</li>
</ul>

<h1>6. Proceso de certificación</h1>
<p>
  El proceso se compone de cuatro etapas accionables, descritas en el Documento
  Descriptivo del Proceso CIOC y resumidas a continuación:
</p>
<table>
  <thead>
    <tr><th>#</th><th>Etapa</th><th>Responsable principal</th></tr>
  </thead>
  <tbody>
    <tr><td class="label">1</td><td>Registro y autorización de tratamiento de datos.</td><td>Candidato</td></tr>
    <tr><td class="label">2</td><td>Carga de documentos y pago de la inscripción.</td><td>Candidato; revisión por RISKS</td></tr>
    <tr><td class="label">3</td><td>Agendamiento y presentación de la(s) evaluación(es).</td><td>Candidato; supervisión por RISKS</td></tr>
    <tr><td class="label">4</td><td>Calificación, revisión por comité (cuando aplique) y emisión del certificado.</td><td>RISKS</td></tr>
  </tbody>
</table>

<h1>7. Tarifas, pagos y reembolsos</h1>
<p>
  Las tarifas vigentes se publican en la plataforma e incluyen el IVA cuando aplica. El
  pago puede realizarse en línea a través de la pasarela Rapyd o por consignación
  bancaria con soporte cargado. La inscripción se hará efectiva una vez verificado el
  pago.
</p>
<p><strong>Política de reembolso:</strong></p>
<ul>
  <li>Si el candidato cancela antes de presentar cualquier evaluación, podrá solicitar reembolso del 70 % del valor pagado durante los primeros 5 días hábiles posteriores al pago.</li>
  <li>Una vez iniciada la evaluación, no procede reembolso.</li>
  <li>Si el proceso es cancelado por causas atribuibles a RISKS, se reembolsará el 100 % del valor pagado.</li>
  <li>Las solicitudes de reembolso se gestionan a través del módulo de Apelaciones del portal del candidato.</li>
</ul>

<h1>8. Vigencia, suspensión y revocación</h1>
<p>
  El certificado emitido tiene la vigencia definida por el esquema (por defecto, tres
  años). RISKS podrá <strong>suspender</strong> o <strong>revocar</strong> el certificado en los siguientes casos:
</p>
<ul>
  <li>Conducta fraudulenta comprobada durante el proceso de evaluación.</li>
  <li>Falsedad o adulteración de soportes documentales.</li>
  <li>Sentencia judicial en firme relacionada con conductas incompatibles con el ejercicio profesional certificado.</li>
  <li>Solicitud expresa y motivada del titular.</li>
</ul>
<p>
  La suspensión o revocación se publicará en la página de verificación pública del
  certificado en <strong>okacreditado.com/verificar/{código}</strong>.
</p>

<h1>9. Recertificación</h1>
<p>
  Antes del vencimiento, RISKS enviará recordatorios automáticos al titular en los
  días 90, 60 y 30 previos. La recertificación es un proceso simplificado que reconoce
  el histórico del titular y solicita únicamente la información nueva o actualizada y
  la presentación de la evaluación correspondiente al esquema vigente.
</p>

<h1>10. Verificación pública</h1>
<p>
  Cada certificado emitido tiene un código único y un código QR que permiten a
  cualquier tercero (empresa, reclutador, ente de control) verificar la autenticidad,
  vigencia y estado del certificado en
  <strong>okacreditado.com/verificar/{código}</strong> sin necesidad de registrarse.
</p>

<h1>11. Apelaciones y quejas</h1>
<p>
  El candidato puede presentar apelaciones, quejas o solicitudes formales a través del
  módulo de Apelaciones del portal. RISKS dará respuesta motivada dentro de los
  <strong>quince (15) días hábiles</strong> siguientes a la radicación.
</p>
<p>
  Las apelaciones que afecten la calificación de una evaluación son resueltas por el
  <strong>Comité Evaluador</strong>, garantizando independencia respecto del evaluador
  original e imparcialidad mediante declaración de conflicto de interés.
</p>

<h1>12. Imparcialidad y confidencialidad</h1>
<p>
  RISKS garantiza la imparcialidad del proceso de certificación: los evaluadores no
  pueden tener conflictos de interés con el candidato; el banco de preguntas es
  gestionado por roles distintos a quienes califican; el comité de apelaciones es
  independiente del evaluador original.
</p>
<p>
  Toda la información del candidato y de la evaluación es confidencial y solo se
  comparte con personas con necesidad legítima de acceso para la operación del proceso
  o cuando lo exija una autoridad competente.
</p>

<h1>13. Limitación de responsabilidad</h1>
<p>
  RISKS no será responsable por interrupciones del servicio causadas por fallas de
  conectividad del candidato, por eventos de fuerza mayor o por actuaciones de terceros
  ajenos al organismo. La plataforma se entrega “como está” en cuanto a su
  disponibilidad, manteniendo un objetivo de servicio razonable propio de servicios
  cloud profesionales.
</p>
<p>
  En ningún caso la responsabilidad de RISKS frente al candidato excederá el valor
  pagado por la inscripción al esquema específico que origine la controversia.
</p>

<h1>14. Modificaciones y ley aplicable</h1>
<p>
  RISKS podrá modificar estos Términos para reflejar cambios normativos, mejoras del
  esquema o ajustes operativos. Las modificaciones sustanciales se comunicarán al
  candidato y a los titulares de certificados vigentes con antelación razonable y
  estarán disponibles en <strong>okacreditado.com/documentacion</strong>.
</p>
<p>
  Estos Términos se rigen por las leyes de la República de Colombia. Las controversias
  serán resueltas por los jueces ordinarios competentes del domicilio de RISKS o, a
  elección de las partes, mediante arbitraje conforme al reglamento del Centro de
  Arbitraje y Conciliación de la Cámara de Comercio de Bogotá.
</p>

<h1>15. Aceptación</h1>
<div class="accept-box">
  <div class="t">Constancia de aceptación</div>
  <div class="b">
    Al inscribirse en un esquema de certificación a través de okacreditado.com, el
    candidato declara haber leído, entendido y aceptado los presentes Términos y
    Condiciones, así como la Política de Tratamiento de Datos Personales. La
    aceptación se registra electrónicamente con marca de tiempo UTC, dirección IP y
    hash SHA-256 del documento aceptado.
  </div>
</div>
`;

// ─── Configuración de los documentos a generar ────────────────────────
const DOCS = [
  {
    slug: "Politica-Tratamiento-Datos",
    title: "Política de Tratamiento de Datos Personales",
    subtitle:
      "Lineamientos para el manejo de datos personales en la plataforma okacreditado.com, en cumplimiento de la Ley 1581 de 2012 y normas concordantes.",
    version: "Versión 1.0",
    toc: HABEAS_TOC,
    body: HABEAS_BODY,
  },
  {
    slug: "Terminos-Condiciones-Acreditacion",
    title: "Términos y Condiciones de la Acreditación",
    subtitle:
      "Condiciones generales aplicables al proceso de certificación de competencias profesionales operado por RISKS INTERNATIONAL bajo la norma ISO/IEC 17024.",
    version: "Versión 1.0",
    toc: TERMS_TOC,
    body: TERMS_BODY,
  },
];

// ─── Render PDF ───────────────────────────────────────────────────────
function buildPdf(doc) {
  const html = makeHtml({
    title: doc.title,
    subtitle: doc.subtitle,
    version: doc.version,
    toc: doc.toc,
    sections: doc.body,
  });
  const tmpHtml = path.join(os.tmpdir(), `${doc.slug}.html`);
  fs.writeFileSync(tmpHtml, html);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPdf = path.join(OUT_DIR, `${doc.slug}.pdf`);
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${outPdf}`,
      `file://${tmpHtml}`,
    ],
    { stdio: "ignore" }
  );
  const size = fs.statSync(outPdf).size;
  console.log(`  ✓ PDF  ${doc.slug}.pdf  (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

// ─── Render DOCX ──────────────────────────────────────────────────────
// Generamos un Word minimalista a partir del mismo CSS+contenido,
// usando docx-js. El Word lleva: logo en portada, header con marca,
// títulos, párrafos justificados, listas y tablas básicas.
const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, ImageRun, Table, TableRow, TableCell,
  HeadingLevel, TabStopType, TabStopPosition,
} = require("docx");

const LOGO_RISKS_BUF = fs.readFileSync(path.join(ASSETS, "risks-logo.png"));
const LOGO_ONAC_BUF = fs.readFileSync(path.join(__dirname, "..", "public", "onac-logo.png"));
const NAVY = "0B1F3A";
const NAVY_MID = "1E3A5F";
const NAVY_SOFT = "EAF0F6";
const SLATE_500 = "64748B";
const SLATE_200 = "E2E8F0";
const SLATE_100 = "F1F5F9";

// Convierte la sección HTML del body a estructura {h1|h2|h3|p|ul|table|callout|accept}
// Parser minimal — solo soporta las etiquetas que efectivamente usamos
// en los contenidos arriba. Devuelve un array de bloques a renderizar.
function parseHtmlBody(html) {
  const blocks = [];
  // Quita comentarios HTML
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  // Match secuencial de bloques
  const re = /<(h1|h2|h3|p|ul|table|div)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, tag, attrs, inner] = m;
    if (tag === "h1") blocks.push({ type: "h1", text: stripTags(inner) });
    else if (tag === "h2") blocks.push({ type: "h2", text: stripTags(inner) });
    else if (tag === "h3") blocks.push({ type: "h3", text: stripTags(inner) });
    else if (tag === "p") blocks.push({ type: "p", text: inner.trim() });
    else if (tag === "ul") {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1].trim());
      blocks.push({ type: "ul", items });
    } else if (tag === "table") {
      const headers = [...inner.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => stripTags(x[1]));
      const rows = [];
      const trMatch = inner.matchAll(/<tr>([\s\S]*?)<\/tr>/g);
      for (const tr of trMatch) {
        const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => stripTags(x[1]));
        if (tds.length) rows.push(tds);
      }
      blocks.push({ type: "table", headers, rows });
    } else if (tag === "div") {
      const classMatch = attrs.match(/class="([^"]+)"/);
      const cls = classMatch ? classMatch[1] : "";
      if (cls.includes("callout") || cls.includes("accept-box")) {
        const title = (inner.match(/<div class="t">([\s\S]*?)<\/div>/) || [, ""])[1].trim();
        const body = (inner.match(/<div class="b">([\s\S]*?)<\/div>/) || [, ""])[1].trim();
        blocks.push({ type: "callout", title: stripTags(title), body: stripTags(body) });
      }
    }
  }
  return blocks;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

/** Convierte un fragmento HTML inline (con <strong>, <em>) a runs de docx. */
function inlineToRuns(html) {
  const runs = [];
  // Tokenizer simple: <strong>..</strong>, <em>..</em>, texto plano, <span ...>..</span>
  const tokens = html.split(/(<\/?(?:strong|em|span)[^>]*>)/g);
  let bold = false, italics = false, mono = false;
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok === "<strong>") { bold = true; continue; }
    if (tok === "</strong>") { bold = false; continue; }
    if (tok === "<em>") { italics = true; continue; }
    if (tok === "</em>") { italics = false; continue; }
    if (/^<span/.test(tok)) { mono = /class="chip"/.test(tok); continue; }
    if (tok === "</span>") { mono = false; continue; }
    // tag desconocido → ignorar
    if (/^<[^>]+>$/.test(tok)) continue;
    runs.push(new TextRun({
      text: stripTags(tok),
      bold, italics,
      font: mono ? "Consolas" : "Inter",
      size: 22,
      color: mono ? NAVY : "1F2937",
    }));
  }
  if (!runs.length) runs.push(new TextRun({ text: stripTags(html), size: 22, font: "Inter" }));
  return runs;
}

function blockToDocxElements(b) {
  if (b.type === "h1") {
    return [new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 200 },
      children: [new TextRun({ text: b.text, bold: true, font: "Figtree", size: 36, color: NAVY })],
    })];
  }
  if (b.type === "h2") {
    return [new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 160 },
      children: [new TextRun({ text: b.text, bold: true, font: "Figtree", size: 28, color: NAVY_MID })],
    })];
  }
  if (b.type === "h3") {
    return [new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 220, after: 120 },
      children: [new TextRun({ text: b.text, bold: true, font: "Figtree", size: 24, color: NAVY })],
    })];
  }
  if (b.type === "p") {
    return [new Paragraph({
      spacing: { before: 60, after: 60, line: 320 },
      alignment: AlignmentType.JUSTIFIED,
      children: inlineToRuns(b.text),
    })];
  }
  if (b.type === "ul") {
    return b.items.map((it) => new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      spacing: { before: 40, after: 40 },
      children: inlineToRuns(it),
    }));
  }
  if (b.type === "callout") {
    return [new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: SLATE_100, type: ShadingType.CLEAR, color: "auto" },
          margins: { top: 200, bottom: 200, left: 240, right: 240 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
            left: { style: BorderStyle.SINGLE, size: 24, color: NAVY },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
            right: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
          },
          children: [
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: b.title, bold: true, font: "Figtree", color: NAVY, size: 24 })],
            }),
            new Paragraph({ children: inlineToRuns(b.body) }),
          ],
        })],
      })],
    })];
  }
  if (b.type === "table") {
    const widths = computeColumnWidths(b.headers.length, 9360);
    return [new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: b.headers.map((h, i) => new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", font: "Figtree", size: 20 })],
            })],
          })),
        }),
        ...b.rows.map((r, idx) => new TableRow({
          children: r.map((c, i) => new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            shading: idx % 2 ? { fill: "FAFBFC", type: ShadingType.CLEAR, color: "auto" } : undefined,
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              left: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              right: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
            },
            children: [new Paragraph({ children: inlineToRuns(c) })],
          })),
        })),
      ],
    })];
  }
  return [];
}

function computeColumnWidths(n, total) {
  if (n === 2) return [Math.floor(total * 0.35), total - Math.floor(total * 0.35)];
  if (n === 3) return [Math.floor(total * 0.3), Math.floor(total * 0.3), total - 2 * Math.floor(total * 0.3)];
  return new Array(n).fill(Math.floor(total / n));
}

async function buildDocx(doc) {
  const blocks = parseHtmlBody(doc.body);
  const bodyElements = blocks.flatMap(blockToDocxElements);

  const cover = [
    new Paragraph({
      spacing: { before: 1800, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png", data: LOGO_RISKS_BUF,
        transformation: { width: 200, height: 154 },
        altText: { title: "RISKS", description: "RISKS INTERNATIONAL", name: "risks" },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [new TextRun({ text: "RISKS INTERNATIONAL", bold: true, color: NAVY, size: 44, font: "Figtree" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({
        text: "Organismo de Certificación de Personas · ISO/IEC 17024",
        color: NAVY, size: 22, font: "Figtree", bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: doc.title, bold: true, color: NAVY, size: 36, font: "Figtree" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1000 },
      children: [new TextRun({ text: doc.subtitle, italics: true, color: SLATE_500, size: 22, font: "Inter" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 80 },
      children: [new TextRun({ text: "Plataforma", color: SLATE_500, size: 20, font: "Figtree", bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "www.okacreditado.com", bold: true, color: NAVY, size: 28, font: "Figtree" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${doc.version} · Bogotá D.C., Colombia · Junio de 2026`, color: SLATE_500, size: 18, font: "Inter" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
      children: [new ImageRun({
        type: "png", data: LOGO_ONAC_BUF, transformation: { width: 70, height: 70 },
        altText: { title: "ONAC", description: "ONAC", name: "onac" },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "En proceso de acreditación ante ONAC", color: NAVY, size: 16, font: "Inter", bold: true })],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })], pageBreakBefore: true }),
  ];

  const document = new Document({
    creator: "RISKS INTERNATIONAL S.A.S.",
    title: doc.title,
    description: doc.subtitle,
    styles: { default: { document: { run: { font: "Inter", size: 22 } } } },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: cover,
      },
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1800, right: 1440, bottom: 1800, left: 1440 } } },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.LEFT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 6 } },
              children: [
                new ImageRun({
                  type: "png", data: LOGO_RISKS_BUF,
                  transformation: { width: 32, height: 25 },
                  altText: { title: "RISKS", description: "RISKS", name: "risks-mini" },
                }),
                new TextRun({ text: `  RISKS INTERNATIONAL · ${doc.title}`, size: 18, font: "Figtree", color: NAVY, bold: true }),
                new TextRun({ text: "\twww.okacreditado.com", size: 18, font: "Inter", color: SLATE_500 }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: SLATE_200, space: 4 } },
              children: [
                new TextRun({ text: "Página ", size: 18, font: "Inter", color: SLATE_500 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Inter", color: NAVY, bold: true }),
                new TextRun({ text: " de ", size: 18, font: "Inter", color: SLATE_500 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Inter", color: NAVY, bold: true }),
                new TextRun({ text: "  ·  Documento oficial", size: 18, font: "Inter", color: SLATE_500 }),
              ],
            })],
          }),
        },
        children: bodyElements,
      },
    ],
  });

  const buf = await Packer.toBuffer(document);
  const outDocx = path.join(OUT_DIR, `${doc.slug}.docx`);
  fs.writeFileSync(outDocx, buf);
  console.log(`  ✓ DOCX ${doc.slug}.docx (${(buf.length / 1024).toFixed(1)} KB)`);
  return buf.length;
}

// ─── Main ─────────────────────────────────────────────────────────────
(async () => {
  for (const doc of DOCS) {
    console.log(`\n${doc.title}`);
    buildPdf(doc);
    await buildDocx(doc);
  }
  console.log("\n✓ Documentos generados en public/docs/");
})();
