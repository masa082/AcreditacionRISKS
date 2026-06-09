/**
 * Genera el "Documento Descriptivo del Proceso de Certificación" en PDF.
 *
 * Estrategia: render HTML profesional con CSS (tipografía premium,
 * paleta de marca, callouts, tablas) → Chrome headless lo imprime a PDF.
 * Más fiel y editable que pdf-lib para documentos largos con layout.
 *
 * Salida:
 *   public/docs/Proceso-Certificacion-okacreditado.pdf
 *
 * El PDF queda en /public para servirse estáticamente desde la app
 * (página /documentacion).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = path.join(__dirname, "..", "public", "docs");
const OUT_PDF = path.join(OUT_DIR, "Proceso-Certificacion-okacreditado.pdf");

// ─── Assets de marca (embebidos en el HTML como data: URIs) ───────────
// Logos: embebidos como base64 en el HTML para que Chrome los pinte sin
// problemas de carga al imprimir. Fuentes Inter/Figtree (las mismas que
// usa risksint.com) también como data: URIs vía @font-face — así el PDF
// queda con la tipografía oficial sin depender de internet.
const ASSETS = path.join(__dirname, "assets");
const b64 = (file) => fs.readFileSync(path.join(ASSETS, file)).toString("base64");
const LOGO_RISKS = `data:image/png;base64,${b64("risks-logo.png")}`;
const FAVICON_RISKS = `data:image/png;base64,${b64("risks-favicon.png")}`;
const ONAC_LOGO = `data:image/png;base64,${fs
  .readFileSync(path.join(__dirname, "..", "public", "onac-logo.png"))
  .toString("base64")}`;
const FONT_INTER = `data:font/woff2;base64,${b64("Inter-Variable.woff2")}`;
const FONT_FIGTREE = `data:font/woff2;base64,${b64("Figtree-Variable.woff2")}`;

// ─── HTML del documento ───────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Proceso de Certificación CIOC — okacreditado.com</title>
<style>
  /* ── Fuentes oficiales de risksint.com (Inter + Figtree) ─────────
     Embebidas como data: URIs para que Chrome las use al imprimir
     sin depender de la red. */
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    font-display: block;
    src: url('${FONT_INTER}') format('woff2');
    font-stretch: normal;
  }
  @font-face {
    font-family: 'Figtree';
    font-style: normal;
    font-weight: 300 900;
    font-display: block;
    src: url('${FONT_FIGTREE}') format('woff2');
    font-stretch: normal;
  }

  /* Paleta RISKS */
  :root {
    --navy-900: #0B1F3A;
    --navy-800: #1E3A5F;
    --navy-50:  #EAF0F6;
    --gold:     #B58B2A;
    --gold-50:  #FFF8E6;
    --slate-500:#64748B;
    --slate-300:#CBD5E1;
    --slate-200:#E2E8F0;
    --slate-100:#F1F5F9;
    --emerald:  #059669;
    --emerald-50:#ECFDF5;
  }
  @page {
    size: Letter;
    margin: 24mm 18mm 24mm 18mm;
    @top-left {
      content: "RISKS INTERNATIONAL · Proceso de Certificación CIOC";
      font-family: 'Figtree', 'Inter', sans-serif;
      font-size: 9pt;
      color: var(--navy-900);
      font-weight: 700;
      letter-spacing: 0.2pt;
    }
    @top-right {
      content: "www.okacreditado.com";
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: var(--slate-500);
      font-weight: 500;
    }
    @bottom-center {
      content: "Página " counter(page) " de " counter(pages) "  ·  Confidencial — Uso interno y de candidatos";
      font-family: 'Inter', sans-serif;
      font-size: 8.5pt;
      color: var(--slate-500);
    }
  }
  @page :first {
    @top-left { content: ""; }
    @top-right { content: ""; }
    @bottom-center { content: ""; }
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #1F2937;
    font-family: 'Inter', 'Helvetica Neue', 'Arial', sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    font-feature-settings: 'cv11', 'ss01', 'ss03';
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  p { text-align: justify; margin: 0 0 10pt 0; }
  h1, h2, h3 {
    font-family: 'Figtree', 'Inter', sans-serif;
    page-break-after: avoid;
    letter-spacing: -0.2pt;
  }
  h1 {
    font-size: 20pt;
    color: var(--navy-900);
    margin: 28pt 0 12pt 0;
    border-bottom: 2pt solid var(--gold);
    padding-bottom: 6pt;
  }
  h2 {
    font-size: 14pt;
    color: var(--navy-800);
    margin: 22pt 0 8pt 0;
  }
  h3 {
    font-size: 12pt;
    color: var(--gold);
    margin: 16pt 0 6pt 0;
    font-style: italic;
  }
  ul { margin: 6pt 0 12pt 0; padding-left: 18pt; }
  li { margin: 3pt 0; }
  li::marker { color: var(--gold); }

  /* Portada */
  .cover {
    page-break-after: always;
    text-align: center;
    padding-top: 60pt;
    height: 95vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .cover-top { display: flex; flex-direction: column; align-items: center; }
  .cover-logo {
    width: 150pt;
    height: auto;
    margin-bottom: 18pt;
  }
  .cover-brand {
    font-family: 'Figtree', sans-serif;
    font-size: 30pt;
    font-weight: 800;
    color: var(--navy-900);
    letter-spacing: -0.4pt;
  }
  .cover-norm {
    margin-top: 6pt;
    color: var(--gold);
    font-weight: 700;
    font-size: 11pt;
    font-family: 'Figtree', sans-serif;
    letter-spacing: 0.5pt;
    text-transform: uppercase;
  }
  .cover-gold-bar {
    width: 80pt;
    height: 3pt;
    background: var(--gold);
    margin: 22pt 0;
  }
  .cover-title {
    font-family: 'Figtree', sans-serif;
    font-size: 28pt;
    color: var(--navy-900);
    font-weight: 800;
    margin-top: 4pt;
    letter-spacing: -0.5pt;
  }
  .cover-sub {
    font-family: 'Inter', sans-serif;
    color: var(--slate-500);
    font-size: 13pt;
    margin-top: 10pt;
    max-width: 480pt;
    font-weight: 400;
  }
  .cover-bottom { display: flex; flex-direction: column; align-items: center; }
  .cover-platform {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 1.5pt;
    color: var(--slate-500);
    font-family: 'Figtree', sans-serif;
    font-weight: 600;
  }
  .cover-url {
    font-family: 'Figtree', sans-serif;
    font-size: 18pt;
    color: var(--navy-900);
    font-weight: 800;
    margin-top: 4pt;
    letter-spacing: -0.3pt;
  }
  .cover-meta {
    margin-top: 18pt;
    font-size: 9pt;
    color: var(--slate-500);
  }
  .cover-onac {
    margin-top: 22pt;
    display: flex;
    align-items: center;
    gap: 14pt;
    padding: 10pt 16pt;
    background: var(--slate-100);
    border-radius: 6pt;
  }
  .cover-onac img { width: 70pt; height: auto; }
  .cover-onac .t {
    font-family: 'Figtree', sans-serif;
    font-size: 8.5pt;
    color: var(--slate-500);
    text-transform: uppercase;
    letter-spacing: 0.8pt;
    font-weight: 700;
  }
  .cover-onac .b {
    font-family: 'Figtree', sans-serif;
    font-size: 10pt;
    color: var(--navy-900);
    font-weight: 700;
    margin-top: 2pt;
  }

  /* Índice */
  .toc {
    margin: 0 0 16pt 0;
    padding: 14pt 18pt;
    background: var(--slate-100);
    border-left: 4pt solid var(--gold);
    page-break-after: always;
  }
  .toc h1 { margin-top: 0; border: none; padding: 0; }
  .toc ol { margin: 10pt 0 0 0; padding: 0; list-style: none; counter-reset: tocs; }
  .toc ol li {
    margin: 4pt 0;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px dotted var(--slate-300);
    padding-bottom: 2pt;
  }
  .toc ol li span:first-child { color: var(--navy-900); font-weight: 600; }
  .toc ol li.sub { padding-left: 14pt; font-size: 9.5pt; }
  .toc ol li.sub span:first-child { color: var(--slate-500); font-weight: 500; }

  /* Tablas */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 14pt 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  thead th {
    background: var(--navy-900);
    color: #fff;
    text-align: left;
    padding: 6pt 8pt;
    font-weight: bold;
    font-size: 9pt;
    letter-spacing: 0.3pt;
  }
  tbody td {
    padding: 6pt 8pt;
    border-bottom: 1px solid var(--slate-200);
    vertical-align: top;
  }
  tbody tr:nth-child(odd) td { background: #FAFBFC; }
  td.step-n {
    background: var(--navy-50) !important;
    font-weight: bold;
    color: var(--navy-900);
    text-align: center;
    font-size: 14pt;
    font-family: 'Georgia', serif;
    width: 28pt;
  }
  td.label { font-weight: bold; color: var(--navy-800); }

  /* Callouts */
  .callout {
    margin: 12pt 0 14pt 0;
    padding: 12pt 14pt;
    background: var(--gold-50);
    border-left: 4pt solid var(--gold);
    border-radius: 2pt;
    page-break-inside: avoid;
  }
  .callout.green {
    background: var(--emerald-50);
    border-left-color: var(--emerald);
  }
  .callout .t {
    font-weight: bold;
    color: var(--navy-900);
    margin-bottom: 4pt;
    font-size: 10.5pt;
  }
  .callout .b { font-size: 10pt; color: #374151; }

  /* Mini “chip” usado en línea */
  .chip {
    display: inline-block;
    padding: 1pt 6pt;
    background: var(--navy-50);
    color: var(--navy-900);
    font-size: 8.5pt;
    font-weight: bold;
    border-radius: 8pt;
    letter-spacing: 0.3pt;
  }

  /* Stepper visual de los 4 pasos */
  .stepper {
    display: flex;
    gap: 8pt;
    margin: 10pt 0 18pt 0;
  }
  .stepper .s {
    flex: 1;
    padding: 12pt 8pt;
    background: var(--navy-50);
    border: 1pt solid var(--slate-200);
    border-radius: 6pt;
    text-align: center;
  }
  .stepper .s .n {
    font-family: 'Georgia', serif;
    font-size: 16pt;
    font-weight: bold;
    color: var(--gold);
  }
  .stepper .s .t {
    font-weight: bold;
    color: var(--navy-900);
    margin-top: 4pt;
    font-size: 9.5pt;
  }
  .stepper .s .d {
    color: var(--slate-500);
    font-size: 8.5pt;
    margin-top: 3pt;
    line-height: 1.3;
  }

  .pagebreak { page-break-after: always; }

  /* Franja de marca al inicio del cuerpo del documento */
  .brand-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10pt 14pt;
    background: var(--navy-50);
    border-radius: 4pt;
    margin-bottom: 16pt;
    border-left: 4pt solid var(--gold);
  }
  .brand-strip .left { display: flex; align-items: center; gap: 12pt; }
  .brand-strip .left img { height: 30pt; width: auto; }
  .brand-strip .left .who {
    font-family: 'Figtree', sans-serif;
    color: var(--navy-900);
    font-weight: 800;
    font-size: 12pt;
    letter-spacing: -0.2pt;
  }
  .brand-strip .left .who small {
    display: block;
    font-weight: 600;
    font-size: 8pt;
    color: var(--slate-500);
    letter-spacing: 0.4pt;
    text-transform: uppercase;
    margin-top: 1pt;
  }
  .brand-strip .right { display: flex; align-items: center; gap: 8pt; }
  .brand-strip .right img { height: 26pt; width: auto; }
  .brand-strip .right .label {
    font-family: 'Figtree', sans-serif;
    font-size: 7.5pt;
    color: var(--slate-500);
    text-transform: uppercase;
    letter-spacing: 0.6pt;
    font-weight: 700;
    text-align: right;
  }
  .brand-strip .right .label strong {
    color: var(--navy-900);
    font-size: 8pt;
    display: block;
    margin-top: 1pt;
  }

  /* Dúo de logos cuando se quiere mostrar al final de la sección 6 */
  .logo-duo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 28pt;
    padding: 14pt;
    background: var(--slate-100);
    border-radius: 6pt;
    margin: 8pt 0 12pt 0;
  }
  .logo-duo img { height: 44pt; width: auto; }
  .logo-duo .x {
    font-size: 14pt;
    color: var(--slate-300);
    font-family: 'Figtree', sans-serif;
    font-weight: 700;
  }
</style>
</head>
<body>

<!-- ═══════════════════ PORTADA ═══════════════════ -->
<section class="cover">
  <div class="cover-top">
    <img class="cover-logo" src="${LOGO_RISKS}" alt="RISKS INTERNATIONAL" />
    <div class="cover-brand">RISKS INTERNATIONAL</div>
    <div class="cover-norm">Organismo de Certificación de Personas · ISO/IEC 17024</div>
  </div>
  <div>
    <div class="cover-gold-bar"></div>
    <div class="cover-title">Documento Descriptivo</div>
    <div class="cover-sub">Proceso de Certificación de Idoneidad como Oficial de Cumplimiento (CIOC)</div>
    <div class="cover-gold-bar"></div>
  </div>
  <div class="cover-bottom">
    <div class="cover-platform">Plataforma</div>
    <div class="cover-url">www.okacreditado.com</div>
    <div class="cover-meta">
      Versión 1.0 · Bogotá D.C., Colombia · Junio de 2026
    </div>
    <div class="cover-onac">
      <img src="${ONAC_LOGO}" alt="ONAC" />
      <div>
        <div class="t">Respaldo institucional</div>
        <div class="b">En proceso de acreditación ante ONAC</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════ ÍNDICE ═══════════════════ -->
<section class="toc">
  <h1>Contenido</h1>
  <ol>
    <li><span>1. Introducción y alcance</span><span>3</span></li>
    <li><span>2. El proceso en 4 pasos simples</span><span>3</span></li>
    <li class="sub"><span>2.1 Detalle por paso</span><span>4</span></li>
    <li><span>3. Módulos por rol</span><span>6</span></li>
    <li class="sub"><span>3.1 Portal del candidato</span><span>6</span></li>
    <li class="sub"><span>3.2 Panel del suscriptor</span><span>7</span></li>
    <li class="sub"><span>3.3 Administración del SaaS</span><span>7</span></li>
    <li><span>4. Cobertura multilenguaje</span><span>8</span></li>
    <li><span>5. Cumplimiento legal — Habeas Data</span><span>9</span></li>
    <li><span>6. Respaldo institucional — ONAC</span><span>10</span></li>
    <li><span>7. Verificación pública por QR</span><span>10</span></li>
    <li><span>8. Anexo técnico</span><span>11</span></li>
    <li><span>9. Cierre y verificación del proceso</span><span>12</span></li>
  </ol>
</section>

<!-- Franja de marca: identifica al organismo y a ONAC en todas las copias impresas -->
<div class="brand-strip">
  <div class="left">
    <img src="${LOGO_RISKS}" alt="RISKS INTERNATIONAL" />
    <div class="who">
      RISKS INTERNATIONAL S.A.S.
      <small>Organismo de Certificación de Personas · ISO/IEC 17024</small>
    </div>
  </div>
  <div class="right">
    <div class="label">
      Respaldo
      <strong>ONAC · en acreditación</strong>
    </div>
    <img src="${ONAC_LOGO}" alt="ONAC" />
  </div>
</div>

<!-- ═══════════════════ 1. INTRODUCCIÓN ═══════════════════ -->
<h1>1. Introducción y alcance</h1>
<p>
  El presente documento describe el proceso de certificación de personas operado por
  <strong>RISKS INTERNATIONAL S.A.S.</strong> a través de la plataforma SaaS multitenant
  <strong>okacreditado.com</strong>. La plataforma soporta el ciclo completo —desde la
  captación del candidato hasta la emisión y verificación pública del certificado— bajo
  los principios de la norma <span class="chip">ISO/IEC 17024</span> y los requisitos del
  Organismo Nacional de Acreditación de Colombia (ONAC).
</p>
<p>
  El alcance del documento cubre las funcionalidades implementadas y desplegadas en
  producción, organizadas por (i) el camino del candidato en cuatro pasos accionables,
  (ii) los módulos por rol (candidato, suscriptor, administrador del SaaS), (iii) la
  cobertura multilenguaje en seis idiomas, (iv) el cumplimiento de habeas data y ONAC,
  y (v) la verificación pública por QR.
</p>
<div class="callout">
  <div class="t">Lo que respalda este documento</div>
  <div class="b">
    Más de una década de RISKS INTERNATIONAL operando SARLAFT, SAGRILAFT y debida
    diligencia desde adentro de las empresas vigiladas — esa experiencia es la que se
    traduce en el programa de certificación CIOC (Certificado de Idoneidad como Oficial
    de Cumplimiento).
  </div>
</div>

<!-- ═══════════════════ 2. LOS 4 PASOS ═══════════════════ -->
<h1>2. El proceso en 4 pasos simples</h1>
<p>
  La interfaz del candidato presenta el proceso como un asistente visual de cuatro pasos
  siempre visible (paso actual resaltado con halo dorado, completados en verde, pendientes
  en gris). Cada paso es un enlace accionable que lleva al lugar exacto donde el candidato
  debe continuar.
</p>

<div class="stepper">
  <div class="s"><div class="n">1</div><div class="t">Registro</div><div class="d">Cuenta + habeas data</div></div>
  <div class="s"><div class="n">2</div><div class="t">Documentos + pago</div><div class="d">Carga + Rapyd o consignación</div></div>
  <div class="s"><div class="n">3</div><div class="t">Evaluación</div><div class="d">Teórico + caso práctico</div></div>
  <div class="s"><div class="n">4</div><div class="t">Certificado</div><div class="d">Diploma con QR público</div></div>
</div>

<table>
  <thead>
    <tr><th>Paso</th><th>Etapa</th><th>Acción del candidato</th><th>Resultado</th></tr>
  </thead>
  <tbody>
    <tr>
      <td class="step-n">1</td>
      <td class="label">Registro</td>
      <td>Crea su cuenta con datos personales y autoriza el tratamiento de datos (habeas data).</td>
      <td>Cuenta activa + correo de bienvenida con PDF de constancia de habeas data firmado.</td>
    </tr>
    <tr>
      <td class="step-n">2</td>
      <td class="label">Documentos + pago</td>
      <td>Carga su hoja de vida, cédula y fotografía. Paga la inscripción en línea (Rapyd) o por consignación bancaria.</td>
      <td>Inscripción aprobada por una persona del organismo; agenda habilitada.</td>
    </tr>
    <tr>
      <td class="step-n">3</td>
      <td class="label">Evaluación de idoneidad</td>
      <td>Agenda fecha y hora. Presenta examen teórico y caso práctico en línea con monitoreo antifraude.</td>
      <td>Calificación automática del teórico y rúbrica para el caso práctico.</td>
    </tr>
    <tr>
      <td class="step-n">4</td>
      <td class="label">Calificación + certificado</td>
      <td>Espera la revisión del comité evaluador (cuando aplica) y la decisión final.</td>
      <td>Diploma PDF con QR público, código único y firma autorizada · vigencia 3 años.</td>
    </tr>
  </tbody>
</table>

<div class="callout green">
  <div class="t">Diseño accionable del wizard</div>
  <div class="b">
    Cada paso es un enlace con destino dinámico. Si el candidato tiene una inscripción
    en curso, el Paso 2 lo lleva a esa inscripción específica; si está cancelada o
    vencida, lo lleva a la lista de programas disponibles. El sistema calcula el paso
    actual a partir del estado de la inscripción más reciente, dando feedback inmediato
    de dónde está el candidato en su camino.
  </div>
</div>

<h2>2.1 Detalle por paso</h2>

<h3>Paso 1 — Registro</h3>
<ul>
  <li>Formulario en cuatro secciones: Datos personales, Ubicación, Contacto y Acceso a la cuenta.</li>
  <li>Selector de país, departamento y municipio con cobertura COMPLETA de DIVIPOLA DANE (33 departamentos + 1.104 municipios) cuando el candidato está en Colombia.</li>
  <li>Selector de organismo certificador (cuando hay más de uno) y de la certificación de interés (SARLAFT disponible, SAGRILAFT marcada como “Próximamente”).</li>
  <li>Bloque de consentimiento de tratamiento de datos con generación de PDF firmado (SHA-256) y envío automático por correo con BCC a gerencia@risksint.com y formacion@risksint.com.</li>
  <li>Detección de duplicados por número de documento y por correo, con mensaje guiado a recuperar contraseña o solicitar actualización al administrador del organismo.</li>
</ul>

<h3>Paso 2 — Documentos + pago</h3>
<ul>
  <li>Carga real de archivos en storage S3 (Railway bucket): hoja de vida, documento de identidad, fotografía a color, certificados laborales.</li>
  <li>Visor de carpeta de evidencias con metadatos (fecha, IP de carga, hash) y revisión humana por parte del personal del organismo.</li>
  <li>Selector de pago “Online (Rapyd)” o “Consignación bancaria”: online con webhook firmado para confirmación automática; consignación con carga de soporte y aprobación manual por el organismo.</li>
  <li>Mostrador de tarifa con detalle “+ IVA”, editable por el suscriptor o por SUPERADMIN.</li>
  <li>Notas legales del proceso de certificación visibles en el flujo de inscripción.</li>
</ul>

<h3>Paso 3 — Evaluación de idoneidad</h3>
<ul>
  <li>Agenda con sesiones programadas por el organismo: el candidato elige fecha y hora dentro de las disponibles.</li>
  <li>Examen teórico con preguntas extraídas del banco curado (SARLAFT y SAGRILAFT cubiertos por el Anexo B), calificación automática inmediata.</li>
  <li>Caso práctico con preguntas de respuesta abierta y carga de archivos; calificación por evaluador con rúbrica.</li>
  <li>Antifraude integrado: marca de agua con datos del candidato, tiempo por pregunta, anti-screenshot, registro de pérdida de foco del navegador, doble timezone en el reloj.</li>
  <li>Constancia de presentación descargable al finalizar.</li>
</ul>

<h3>Paso 4 — Calificación + certificado</h3>
<ul>
  <li>Comité evaluador con votos, declaración de conflicto de interés y decisión final cuando aplica.</li>
  <li>Emisión del diploma en PDF en formato horizontal con bordes dorados, sello, micro-seguridad, logos de RISKS y de ONAC.</li>
  <li>Cada certificado lleva código único, QR de verificación pública y firma autorizada.</li>
  <li>Vigencia configurable (3 años por defecto) con recordatorios automáticos 90/60/30 días antes del vencimiento.</li>
  <li>Acción de envío por correo y por WhatsApp desde el panel del suscriptor.</li>
</ul>

<!-- ═══════════════════ 3. MÓDULOS POR ROL ═══════════════════ -->
<h1>3. Módulos por rol</h1>
<p>
  La plataforma divide la operación en tres áreas con permisos y vistas dedicadas. Cada
  área tiene su propio sidebar agrupado, header y conjunto de funcionalidades. Todas las
  consultas filtran por <span class="chip">subscriberId</span> para garantizar el
  aislamiento multitenant.
</p>

<h2>3.1 Portal del candidato (/portal)</h2>
<p>
  Cada candidato accede a un portal personal con sidebar agrupado en “Proceso” y
  “Soporte”. El header muestra el logo del organismo, el switcher de idioma (6 idiomas)
  y el indicador de “en línea”.
</p>
<ul>
  <li><strong>Mi proceso:</strong> wizard de 4 pasos cliqueables, KPIs (inscripciones, certificados vigentes, acciones pendientes) y lista de procesos con estado vivo.</li>
  <li><strong>Evaluaciones disponibles:</strong> programas agrupados por esquema, con los <strong>DISPONIBLES primero</strong> y luego los “Próximamente”; detalle de inversión, vigencia y exámenes incluidos.</li>
  <li><strong>Inscripción guiada paso a paso:</strong> consentimiento → documentos → pago → agenda → presentación.</li>
  <li><strong>Mi agenda:</strong> calendario con sesiones agendadas.</li>
  <li><strong>Mis pagos:</strong> tabla con filtros, búsqueda y datos de Rapyd.</li>
  <li><strong>Mis certificados:</strong> descarga del diploma y de la Hoja de Vida del Candidato (PDF) con cardex, conocimientos, antecedentes y autorizaciones.</li>
  <li><strong>Apelaciones y solicitudes:</strong> módulo de quejas, apelaciones y solicitudes con bandeja de respuestas.</li>
  <li><strong>Mi perfil:</strong> edición de datos personales, múltiples correos por usuario, cambio de contraseña.</li>
</ul>

<h2>3.2 Panel del suscriptor (/panel)</h2>
<p>
  El suscriptor —típicamente un organismo certificador como RISKS INTERNATIONAL—
  administra todo el ciclo de vida desde un panel propio.
</p>
<ul>
  <li><strong>Dashboard BI profesional:</strong> KPIs, gráficas y comparativo año anterior.</li>
  <li><strong>Candidatos 360°:</strong> filtros, columnas extra, exportación a Excel, envío masivo de correos, edición y Hoja de Vida visual.</li>
  <li><strong>Evaluaciones:</strong> configuración de exámenes, modalidad, duración, intentos permitidos.</li>
  <li><strong>Banco de preguntas:</strong> CRUD inline con filtros, tags, estadísticas; importación masiva.</li>
  <li><strong>Calendario de agenda</strong> con sesiones, candidatos y manejo en UTC.</li>
  <li><strong>Pagos recibidos:</strong> tabla con filtros, búsqueda, datos Rapyd y conciliación.</li>
  <li><strong>Certificados:</strong> filtros y acciones de envío (email / WhatsApp).</li>
  <li><strong>Roles, usuarios y equipo:</strong> edición de usuarios, permisos por módulo.</li>
  <li><strong>Configuración de marketing:</strong> banner de urgencia, certificados destacados, copy editable.</li>
  <li><strong>Organización:</strong> logo, datos del organismo, claves de Rapyd, configuración de footer y diploma.</li>
  <li>Leads, referidos, reportes, vencimientos, apelaciones y feedback.</li>
</ul>

<h2>3.3 Administración del SaaS (/admin)</h2>
<p>
  El SUPERADMIN gestiona los suscriptores (organismos clientes) y la operación del SaaS
  multitenant.
</p>
<ul>
  <li><strong>Suscriptores:</strong> alta, planes, métricas y marca por cliente.</li>
  <li><strong>Tarifas:</strong> editor de FeeConfig con previsualización de “+ IVA”.</li>
  <li><strong>Tickets de feedback</strong> de candidatos y suscriptores.</li>
  <li><strong>Diagnóstico operativo</strong> (envío de correo, hora legal CO, fuentes embebidas).</li>
  <li><strong>Paleta de colores parametrizable</strong> para reporte y diplomas por suscriptor.</li>
</ul>

<!-- ═══════════════════ 4. MULTILENGUAJE ═══════════════════ -->
<h1>4. Cobertura multilenguaje</h1>
<p>
  La plataforma soporta seis idiomas con cobertura del 100 % en las 382 entradas del
  diccionario centralizado. El usuario elige idioma desde un switcher en el header (con
  bandera + nombre nativo) que persiste la preferencia en cookie por un año.
</p>

<table>
  <thead>
    <tr><th>Código</th><th>Idioma</th><th>Cobertura geográfica principal</th></tr>
  </thead>
  <tbody>
    <tr><td class="label">es</td><td class="label">Español</td><td>LATAM (Colombia, México, Centroamérica, Cono Sur) y España</td></tr>
    <tr><td class="label">en</td><td class="label">English</td><td>Estados Unidos, Reino Unido, Canadá, Caribe anglófono</td></tr>
    <tr><td class="label">pt</td><td class="label">Português</td><td>Brasil, Portugal, Angola, Mozambique</td></tr>
    <tr><td class="label">fr</td><td class="label">Français</td><td>Francia, Bélgica, Suiza, Canadá francés</td></tr>
    <tr><td class="label">it</td><td class="label">Italiano</td><td>Italia, Suiza italiana, San Marino</td></tr>
    <tr><td class="label">de</td><td class="label">Deutsch</td><td>Alemania, Austria, Suiza alemana, Liechtenstein</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="t">Fallback inteligente</div>
  <div class="b">
    Si una traducción puntual no existe para el idioma seleccionado, la cascada degrada
    a inglés y solo si falta también baja a español. Esto evita que un usuario francés,
    italiano o alemán vea aleatoriamente cadenas en español por una key sin traducir.
  </div>
</div>

<h2>4.1 Superficies traducidas</h2>
<ul>
  <li>Landing comercial (/): hero, micro-formulario, secciones de prueba social, beneficios, perfiles, pasos del proceso, comparativa, FAQ, testimonios, ROI y CTAs finales.</li>
  <li>Página de registro (/registro): formulario completo, hints, mensajes de error, mensaje de éxito y selector de certificación.</li>
  <li>Portal del candidato: títulos de página, KPIs, estados de inscripción, wizard de 4 pasos, empty states.</li>
  <li>Selector de idioma persistente en header del landing, en /registro y en el header del DashboardShell (portal, panel, admin).</li>
</ul>

<!-- ═══════════════════ 5. HABEAS DATA ═══════════════════ -->
<h1>5. Cumplimiento legal — Habeas Data</h1>
<p>
  El registro del candidato implementa la <strong>Ley 1581 de 2012</strong> (régimen
  general de protección de datos personales en Colombia) y su Decreto 1377 de 2013.
</p>
<ul>
  <li>Consentimiento explícito visible y separado del envío del formulario; checkbox obligatorio.</li>
  <li>Versión de política versionada (v2026-06-05) almacenada con cada autorización.</li>
  <li>Persistencia en <span class="chip">DataConsent</span> con IP, User-Agent y hash SHA-256 del snapshot completo del consentimiento — evidencia legal verificable.</li>
  <li>Generación automática de un PDF firmado con la autorización, recibido por el titular al correo registrado.</li>
  <li>Copia obligatoria a gerencia@risksint.com y formacion@risksint.com en BCC para trazabilidad del organismo.</li>
  <li>Página pública /privacidad con habeas data interactivo (qué se trata, finalidades, derechos del titular, canales de revocación).</li>
  <li>Política de seguridad: nunca se exponen claves de API; los soportes se almacenan en object storage con URLs firmadas SHA-256.</li>
</ul>

<!-- ═══════════════════ 6. ONAC ═══════════════════ -->
<h1>6. Respaldo institucional — ONAC</h1>

<div class="logo-duo">
  <img src="${LOGO_RISKS}" alt="RISKS INTERNATIONAL" />
  <span class="x">×</span>
  <img src="${ONAC_LOGO}" alt="ONAC" />
</div>

<p>
  RISKS INTERNATIONAL está en proceso de acreditación ante el Organismo Nacional de
  Acreditación de Colombia (ONAC) como Organismo de Certificación de Personas bajo la
  norma ISO/IEC 17024.
</p>
<ul>
  <li>Logo ONAC con wordmark completo y fuente embebida en footer público, panel y diploma.</li>
  <li>Leyenda “En proceso de acreditación” mostrada con transparencia en todas las superficies relevantes.</li>
  <li>Footer público con justificación a la derecha y hora legal colombiana.</li>
  <li>Diploma con doble logo (organismo certificador + ONAC), sello dorado, micro-seguridad y QR público.</li>
  <li>Página /verificar con búsqueda por código o por número de documento, mostrando logos del organismo y de ONAC con la leyenda correspondiente.</li>
</ul>

<!-- ═══════════════════ 7. VERIFICACIÓN ═══════════════════ -->
<h1>7. Verificación pública por QR</h1>
<p>
  Cada certificado emitido lleva un código único y un código QR que cualquier tercero
  (empresa, reclutador, ente de control) puede escanear con su teléfono para verificar
  la autenticidad en segundos.
</p>
<ul>
  <li>URL pública del tipo <strong>okacreditado.com/verificar/{código}</strong> con página propia por certificado.</li>
  <li>La página muestra: nombre del titular, programa, vigencia, estado (VÁLIDO / VENCIDO / REVOCADO), logos del organismo y de ONAC.</li>
  <li>Descarga del PDF del certificado disponible desde la propia página de verificación.</li>
  <li>La verificación no requiere registro ni cuenta — está pensada para la apertura máxima al verificador externo.</li>
  <li>Búsqueda alternativa por número de documento en /verificar para casos en que no se tenga el código.</li>
</ul>

<!-- ═══════════════════ 8. ANEXO TÉCNICO ═══════════════════ -->
<h1>8. Anexo técnico</h1>
<p>Resumen de la pila tecnológica desplegada en producción:</p>
<table>
  <thead>
    <tr><th style="width:34%">Capa</th><th>Tecnología</th></tr>
  </thead>
  <tbody>
    <tr><td class="label">Framework</td><td>Next.js 15 (App Router) con Server Components y Server Actions</td></tr>
    <tr><td class="label">Base de datos</td><td>PostgreSQL en Railway, multitenant por fila con RLS</td></tr>
    <tr><td class="label">ORM</td><td>Prisma</td></tr>
    <tr><td class="label">Hosting frontend</td><td>Vercel (despliegue automático desde main)</td></tr>
    <tr><td class="label">Almacenamiento de archivos</td><td>Object Storage S3 en Railway con URLs firmadas SHA-256</td></tr>
    <tr><td class="label">Pagos online</td><td>Rapyd con claves por suscriptor + webhook con firma HMAC</td></tr>
    <tr><td class="label">Correo transaccional</td><td>Resend con plantillas HTML + adjuntos en base64</td></tr>
    <tr><td class="label">PDF (diploma · CV · Habeas Data)</td><td>pdf-lib con fuentes embebidas + QR code</td></tr>
    <tr><td class="label">Estilos</td><td>Tailwind v4 con paleta brand (navy + dorado) parametrizable</td></tr>
    <tr><td class="label">Seguridad</td><td>Headers de hardening, RLS por suscriptor, antifraude en examen</td></tr>
  </tbody>
</table>

<!-- ═══════════════════ 9. CIERRE ═══════════════════ -->
<h1>9. Cierre y verificación del proceso</h1>
<p>
  El proceso descrito está operativo en producción en
  <strong>https://www.okacreditado.com</strong>. Cada paso —desde el registro hasta la
  emisión— deja huella auditable: snapshots de consentimiento, hashes de archivos,
  registros de presentación de examen, votos del comité y firma del certificado.
</p>
<p>
  Para validar un certificado emitido, cualquier tercero puede escanear el QR del
  diploma o visitar <strong>okacreditado.com/verificar</strong> e ingresar el código o
  el número de documento del titular.
</p>
<div class="callout">
  <div class="t">Compromiso del organismo</div>
  <div class="b">
    Cada certificado emitido por RISKS INTERNATIONAL S.A.S. lleva el respaldo de más de
    una década operando SARLAFT, SAGRILAFT y debida diligencia desde dentro de las
    empresas vigiladas — y el respaldo institucional del proceso de acreditación ante
    ONAC bajo la norma ISO/IEC 17024.
  </div>
</div>

</body>
</html>`;

// ─── Generar PDF con Chrome headless ──────────────────────────────────
const tmpHtml = path.join(os.tmpdir(), "proceso-cioc.html");
fs.writeFileSync(tmpHtml, html);
fs.mkdirSync(OUT_DIR, { recursive: true });

execFileSync(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${OUT_PDF}`,
    `file://${tmpHtml}`,
  ],
  { stdio: "inherit" }
);

const stat = fs.statSync(OUT_PDF);
console.log(`✓ PDF generado: ${OUT_PDF} (${(stat.size / 1024).toFixed(1)} KB)`);
