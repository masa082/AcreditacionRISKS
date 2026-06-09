/**
 * Genera el "Documento Descriptivo del Proceso de Certificación" para
 * okacreditado.com / RISKS INTERNATIONAL. El doc resultante (.docx) cubre:
 *  - Visión general de la plataforma
 *  - Los 4 pasos del proceso de certificación (con UX implementada)
 *  - Módulos: portal del candidato, panel del suscriptor, admin del SaaS
 *  - Multilenguaje (ES, EN, PT, FR, IT, DE)
 *  - Habeas Data, ONAC, verificación pública por QR
 *  - Anexos técnicos
 *
 * Se ejecuta con:   node docs/build-doc.cjs
 * Genera:           docs/Proceso-Certificacion-okacreditado.docx
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  TabStopType, TabStopPosition, TableOfContents, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber,
  PageBreak, ImageRun,
} = require("docx");

// ─── Assets de marca ──────────────────────────────────────────────────
// Logos PNG embebidos directamente como buffers binarios; Word los
// incrusta dentro del .docx. Para las fuentes, el .docx solo guarda el
// NOMBRE — el lector (Word) busca la fuente instalada. Inter y Figtree
// están en Google Fonts (gratuitas y comunes); Word ofrecerá descargarlas
// si el lector no las tiene.
const LOGO_RISKS = fs.readFileSync(path.join(__dirname, "assets", "risks-logo.png"));
const LOGO_ONAC = fs.readFileSync(path.join(__dirname, "..", "public", "onac-logo.png"));
const BODY_FONT = "Inter";       // misma fuente que usa risksint.com en el body
const HEADING_FONT = "Figtree";  // misma fuente que usa risksint.com en titulares

// ─── Paleta de marca RISKS ────────────────────────────────────────────
const NAVY = "0B1F3A";       // brand-900
const NAVY_MID = "1E3A5F";   // brand-800
const NAVY_SOFT = "EAF0F6";  // brand-50
const GOLD = "B58B2A";       // gold-600
const SLATE_500 = "64748B";
const SLATE_200 = "E2E8F0";
const EMERALD = "059669";
const WHITE = "FFFFFF";

// US Letter (común en LATAM y EE.UU.)
const PAGE_W = 12240;
const PAGE_H = 15840;
const M = 1440;
const CONTENT_W = PAGE_W - 2 * M;

// ─── Helpers de formato ───────────────────────────────────────────────
const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: 60, after: 60, line: 320 },
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    ...opts.paragraph,
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, size: 22, font: BODY_FONT, color: "333333", ...opts.run })],
  });

const h = (text, level, opts = {}) =>
  new Paragraph({
    heading: level,
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: BODY_FONT,
        color: opts.color ?? NAVY,
        size: opts.size,
      }),
    ],
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: BODY_FONT, color: "333333" })],
  });

const bulletRich = (children) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children,
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: BODY_FONT, color: "333333" })],
  });

const blank = () => p("");

const cell = (text, opts = {}) =>
  new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
      left: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
      right: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
    },
    children: Array.isArray(text)
      ? text
      : [
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text,
                font: BODY_FONT,
                size: opts.bold ? 22 : 21,
                bold: opts.bold,
                color: opts.color ?? (opts.bold ? NAVY : "333333"),
              }),
            ],
          }),
        ],
  });

const headerRow = (labels, widths) =>
  new TableRow({
    tableHeader: true,
    children: labels.map((l, i) =>
      cell(l, { width: widths[i], fill: NAVY, color: WHITE, bold: true })
    ),
  });

// Caja destacada (un table 1×1) para callouts visuales.
const callout = (title, body, color = GOLD) =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: "FFF8E6", type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 24, color },
              left: { style: BorderStyle.SINGLE, size: 24, color },
              bottom: { style: BorderStyle.SINGLE, size: 6, color },
              right: { style: BorderStyle.SINGLE, size: 6, color },
            },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    color: NAVY,
                    size: 24,
                    font: BODY_FONT,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: body,
                    size: 22,
                    font: BODY_FONT,
                    color: "333333",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

// ─── Sección: portada ─────────────────────────────────────────────────
const cover = [
  // Logo oficial RISKS — embebido en la portada
  new Paragraph({
    spacing: { before: 1800, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        type: "png",
        data: LOGO_RISKS,
        transformation: { width: 200, height: 154 },
        altText: {
          title: "RISKS INTERNATIONAL",
          description: "Logo oficial de RISKS INTERNATIONAL S.A.S.",
          name: "risks-logo",
        },
      }),
    ],
  }),
  new Paragraph({
    spacing: { before: 100, after: 100 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "RISKS INTERNATIONAL",
        bold: true,
        color: NAVY,
        size: 44,
        font: HEADING_FONT,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 700 },
    children: [
      new TextRun({
        text: "Organismo de Certificación de Personas · ISO/IEC 17024",
        color: GOLD,
        size: 22,
        font: HEADING_FONT,
        bold: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text: "Documento Descriptivo",
        bold: true,
        color: NAVY,
        size: 36,
        font: HEADING_FONT,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [
      new TextRun({
        text: "Proceso de Certificación de Idoneidad como Oficial de Cumplimiento (CIOC)",
        italics: true,
        color: SLATE_500,
        size: 26,
        font: BODY_FONT,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1600, after: 80 },
    children: [
      new TextRun({ text: "Plataforma", color: SLATE_500, size: 20, font: HEADING_FONT, bold: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "www.okacreditado.com",
        bold: true,
        color: NAVY,
        size: 28,
        font: HEADING_FONT,
      }),
    ],
  }),
  // Logo ONAC con leyenda "en acreditación"
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [
      new ImageRun({
        type: "png",
        data: LOGO_ONAC,
        transformation: { width: 70, height: 70 },
        altText: {
          title: "ONAC",
          description: "Logo del Organismo Nacional de Acreditación de Colombia",
          name: "onac-logo",
        },
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: "En proceso de acreditación ante ONAC",
        color: GOLD,
        size: 16,
        font: BODY_FONT,
        bold: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "Versión 1.0", color: SLATE_500, size: 18, font: BODY_FONT }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "Bogotá D.C., Colombia · Junio de 2026",
        color: SLATE_500,
        size: 18,
        font: BODY_FONT,
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── Sección: índice ──────────────────────────────────────────────────
const tocSection = [
  h("Contenido", HeadingLevel.HEADING_1),
  new TableOfContents("Contenido", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── Franja de marca al inicio del cuerpo (después del TOC) ───────────
// Identifica al organismo certificador y al respaldo ONAC en cada copia
// impresa, sin importar de qué página se parta.
const brandStrip = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [Math.floor(CONTENT_W * 0.6), Math.floor(CONTENT_W * 0.4)],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: Math.floor(CONTENT_W * 0.6), type: WidthType.DXA },
          shading: { fill: NAVY_SOFT, type: ShadingType.CLEAR, color: "auto" },
          margins: { top: 200, bottom: 200, left: 240, right: 200 },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.SINGLE, size: 32, color: GOLD },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  type: "png",
                  data: LOGO_RISKS,
                  transformation: { width: 60, height: 46 },
                  altText: { title: "RISKS", description: "RISKS INTERNATIONAL", name: "risks" },
                }),
                new TextRun({
                  text: "   RISKS INTERNATIONAL S.A.S.",
                  bold: true,
                  font: HEADING_FONT,
                  color: NAVY,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 60 },
              children: [
                new TextRun({
                  text: "Organismo de Certificación de Personas · ISO/IEC 17024",
                  font: BODY_FONT,
                  color: SLATE_500,
                  size: 16,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: Math.floor(CONTENT_W * 0.4), type: WidthType.DXA },
          shading: { fill: NAVY_SOFT, type: ShadingType.CLEAR, color: "auto" },
          margins: { top: 200, bottom: 200, left: 200, right: 240 },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Respaldo institucional",
                  font: HEADING_FONT,
                  color: SLATE_500,
                  size: 16,
                  bold: true,
                  allCaps: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 80 },
              children: [
                new ImageRun({
                  type: "png",
                  data: LOGO_ONAC,
                  transformation: { width: 42, height: 42 },
                  altText: { title: "ONAC", description: "ONAC", name: "onac" },
                }),
                new TextRun({
                  text: "  ONAC",
                  bold: true,
                  font: HEADING_FONT,
                  color: NAVY,
                  size: 22,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "en proceso de acreditación",
                  font: BODY_FONT,
                  color: SLATE_500,
                  size: 14,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
});

// ─── 1. Introducción ──────────────────────────────────────────────────
const intro = [
  // Franja de marca antes del primer título — solo aparece una vez.
  new Paragraph({ children: [], spacing: { after: 60 } }),
  brandStrip,
  new Paragraph({ children: [], spacing: { after: 240 } }),

  h("1. Introducción y alcance", HeadingLevel.HEADING_1),
  p(
    "El presente documento describe el proceso de certificación de personas operado por RISKS INTERNATIONAL S.A.S. a través de la plataforma SaaS multitenant okacreditado.com. La plataforma soporta el ciclo completo —desde la captación del candidato hasta la emisión y verificación pública del certificado— bajo los principios de la norma ISO/IEC 17024 y los requisitos del Organismo Nacional de Acreditación de Colombia (ONAC)."
  ),
  p(
    "El alcance del documento cubre las funcionalidades implementadas y desplegadas en producción, organizadas por (i) el camino del candidato en cuatro pasos accionables, (ii) los módulos por rol (candidato, suscriptor, administrador del SaaS), (iii) la cobertura multilenguaje, (iv) el cumplimiento de habeas data y ONAC, y (v) la verificación pública por QR."
  ),
  callout(
    "Lo que respalda este documento",
    "Más de una década de RISKS INTERNATIONAL operando SARLAFT, SAGRILAFT y debida diligencia desde adentro de las empresas vigiladas — esa experiencia es la que se traduce en el programa de certificación CIOC (Certificado de Idoneidad como Oficial de Cumplimiento)."
  ),
];

// ─── 2. El proceso en 4 pasos ─────────────────────────────────────────
const stepsTableRows = [
  headerRow(["Paso", "Etapa", "Acción del candidato", "Resultado"], [
    900, 2200, 3400, 2860,
  ]),
  new TableRow({
    children: [
      cell("1", { width: 900, fill: NAVY_SOFT, bold: true }),
      cell("Registro", { width: 2200, bold: true }),
      cell(
        "Crea su cuenta con datos personales y autoriza el tratamiento de datos (habeas data).",
        { width: 3400 }
      ),
      cell(
        "Cuenta activa + correo de bienvenida con PDF de constancia de habeas data firmado.",
        { width: 2860 }
      ),
    ],
  }),
  new TableRow({
    children: [
      cell("2", { width: 900, fill: NAVY_SOFT, bold: true }),
      cell("Documentos + pago", { width: 2200, bold: true }),
      cell(
        "Carga su hoja de vida, cédula y fotografía. Paga la inscripción en línea (Rapyd) o por consignación bancaria.",
        { width: 3400 }
      ),
      cell(
        "Inscripción aprobada por una persona del organismo; agenda habilitada.",
        { width: 2860 }
      ),
    ],
  }),
  new TableRow({
    children: [
      cell("3", { width: 900, fill: NAVY_SOFT, bold: true }),
      cell("Evaluación de idoneidad", { width: 2200, bold: true }),
      cell(
        "Agenda fecha y hora. Presenta examen teórico y caso práctico en línea, con monitoreo antifraude (marca de agua, anti-screenshot, tiempo por pregunta).",
        { width: 3400 }
      ),
      cell(
        "Calificación automática del teórico y rúbrica para el caso práctico.",
        { width: 2860 }
      ),
    ],
  }),
  new TableRow({
    children: [
      cell("4", { width: 900, fill: NAVY_SOFT, bold: true }),
      cell("Calificación + certificado", { width: 2200, bold: true }),
      cell(
        "Espera la revisión del comité evaluador (cuando aplica) y la decisión final.",
        { width: 3400 }
      ),
      cell(
        "Diploma PDF con QR público, código único y firma autorizada · vigencia 3 años.",
        { width: 2860 }
      ),
    ],
  }),
];

const stepsSection = [
  h("2. El proceso en 4 pasos simples", HeadingLevel.HEADING_1),
  p(
    "La interfaz del candidato presenta el proceso como un asistente visual de cuatro pasos siempre visible (paso actual resaltado con halo dorado, pasos completados en verde, pasos pendientes en gris). Cada paso es un enlace accionable que lleva al lugar exacto donde el candidato debe continuar."
  ),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [900, 2200, 3400, 2860],
    rows: stepsTableRows,
  }),
  blank(),
  callout(
    "Diseño accionable del wizard",
    "Cada paso es un <Link> con destino dinámico. Si el candidato tiene una inscripción en curso, el Paso 2 lo lleva a esa inscripción específica; si está cancelada o vencida, lo lleva a la lista de programas disponibles. El sistema calcula el paso actual a partir del estado de la inscripción más reciente, dando feedback inmediato de dónde está el candidato en su camino.",
    EMERALD
  ),
];

// ─── 2.1 Detalle de cada paso ─────────────────────────────────────────
const stepDetail = (title, items) => [
  h(title, HeadingLevel.HEADING_2),
  ...items.map((i) => bullet(i)),
];

const stepsDetail = [
  h("2.1 Detalle por paso", HeadingLevel.HEADING_2),
  h("Paso 1 — Registro", HeadingLevel.HEADING_3),
  ...[
    "Formulario en cuatro secciones: Datos personales, Ubicación, Contacto y Acceso a la cuenta.",
    "Selector de país, departamento y municipio con cobertura COMPLETA de DIVIPOLA DANE (33 departamentos + 1.104 municipios) cuando el candidato está en Colombia.",
    "Selector de organismo certificador (cuando hay más de uno) y de la certificación de interés (SARLAFT disponible, SAGRILAFT marcada como “Próximamente”).",
    "Bloque de consentimiento de tratamiento de datos con generación de PDF firmado (SHA-256) y envío automático por correo con BCC a gerencia@risksint.com y formacion@risksint.com.",
    "Detección de duplicados por número de documento y por correo, con mensaje guiado a recuperar contraseña o solicitar actualización al administrador del organismo.",
  ].map((t) => bullet(t)),
  h("Paso 2 — Documentos + pago", HeadingLevel.HEADING_3),
  ...[
    "Carga real de archivos en storage S3 (Railway bucket): hoja de vida, documento de identidad, fotografía a color, certificados laborales.",
    "Visor de carpeta de evidencias con metadatos (fecha, IP de carga, hash) y revisión humana por parte del personal del organismo.",
    "Selector de pago “Online (Rapyd)” o “Consignación bancaria”: online con webhook firmado para confirmación automática; consignación con carga de soporte y aprobación manual por el organismo.",
    "Mostrador de tarifa con detalle “+ IVA”, editable por el suscriptor en /admin/tarifas o por SUPERADMIN.",
    "Notas legales del proceso de certificación visibles en el flujo de inscripción.",
  ].map((t) => bullet(t)),
  h("Paso 3 — Evaluación de idoneidad", HeadingLevel.HEADING_3),
  ...[
    "Agenda con sesiones programadas por el organismo: el candidato elige fecha y hora dentro de las disponibles.",
    "Examen teórico con preguntas extraídas del banco curado (SARLAFT y SAGRILAFT cubiertos por el Anexo B), calificación automática inmediata.",
    "Caso práctico con preguntas de respuesta abierta y carga de archivos; calificación por evaluador con rúbrica.",
    "Antifraude integrado: marca de agua con datos del candidato, tiempo por pregunta, anti-screenshot, registro de pérdida de foco del navegador, doble timezone en el reloj.",
    "Constancia de presentación descargable al finalizar.",
  ].map((t) => bullet(t)),
  h("Paso 4 — Calificación + certificado", HeadingLevel.HEADING_3),
  ...[
    "Comité evaluador con votos, declaración de conflicto de interés y decisión final cuando aplica.",
    "Emisión del diploma en PDF en formato horizontal con bordes dorados, sello, micro-seguridad, logos de RISKS y de ONAC.",
    "Cada certificado lleva código único, QR de verificación pública y firma autorizada.",
    "Vigencia configurable (3 años por defecto) con recordatorios automáticos 90/60/30 días antes del vencimiento.",
    "Acción de envío por correo y por WhatsApp desde el panel del suscriptor.",
  ].map((t) => bullet(t)),
];

// ─── 3. Módulos por rol ───────────────────────────────────────────────
const candidateModule = [
  h("3.1 Portal del candidato (/portal)", HeadingLevel.HEADING_2),
  p(
    "Cada candidato accede a un portal personal con sidebar agrupado en “Proceso” y “Soporte”. El header muestra el logo del organismo, el switcher de idioma (6 idiomas) y el indicador de “en línea”."
  ),
  bullet("Mi proceso: wizard de 4 pasos cliqueables, KPIs (inscripciones, certificados vigentes, acciones pendientes) y lista de procesos con estado vivo."),
  bullet("Evaluaciones disponibles: programas agrupados por esquema, ordenando primero los DISPONIBLES y luego los “Próximamente”, con detalle de inversión, vigencia y exámenes incluidos."),
  bullet("Inscripción guiada paso a paso: consentimiento → documentos → pago → agenda → presentación."),
  bullet("Mi agenda: calendario con sesiones agendadas y posibilidad de reprogramar (cuando lo permita el organismo)."),
  bullet("Mis pagos: tabla con filtros, búsqueda y datos de Rapyd."),
  bullet("Mis certificados: descarga del diploma y de la Hoja de Vida del Candidato (PDF) con cardex, conocimientos, antecedentes y autorizaciones."),
  bullet("Apelaciones y solicitudes: módulo de quejas, apelaciones y solicitudes con bandeja de respuestas."),
  bullet("Mi perfil: edición de datos personales, múltiples correos por usuario, cambio de contraseña."),
];

const subscriberModule = [
  h("3.2 Panel del suscriptor (/panel)", HeadingLevel.HEADING_2),
  p(
    "El suscriptor —típicamente un organismo certificador como RISKS INTERNATIONAL— administra todo el ciclo de vida desde un panel propio. Cada suscriptor tiene aislamiento de datos por fila (multitenant)."
  ),
  bullet("Dashboard BI profesional: KPIs, gráficas y comparativo año anterior."),
  bullet("Candidatos 360°: filtros, columnas extra, exportación a Excel, envío masivo de correos, edición y Hoja de Vida visual."),
  bullet("Evaluaciones: configuración de exámenes, modalidad, duración, intentos permitidos."),
  bullet("Banco de preguntas: CRUD inline con filtros, tags, estadísticas; importación masiva."),
  bullet("Calendario de agenda con sesiones, candidatos agendados y manejo en UTC."),
  bullet("Pagos recibidos: tabla con filtros, búsqueda, datos Rapyd y conciliación."),
  bullet("Certificados: filtros y acciones de envío (email / WhatsApp)."),
  bullet("Roles, usuarios y equipo: edición de usuarios, permisos por módulo."),
  bullet("Configuración de marketing: banner de urgencia, certificados destacados, copy editable."),
  bullet("Organización: logo, datos del organismo, claves de Rapyd, configuración de footer y diploma."),
  bullet("Leads, referidos, reportes, vencimientos, apelaciones y feedback."),
];

const adminModule = [
  h("3.3 Administración del SaaS (/admin)", HeadingLevel.HEADING_2),
  p(
    "El SUPERADMIN gestiona los suscriptores (organismos clientes) y la operación del SaaS multitenant."
  ),
  bullet("Suscriptores: alta, planes, métricas y marca por cliente."),
  bullet("Tarifas: editor de FeeConfig con previsualización de “+ IVA”."),
  bullet("Tickets de feedback de candidatos y suscriptores."),
  bullet("Diagnóstico operativo (envío de correo, hora legal CO, fuentes embebidas)."),
  bullet("Paleta de colores parametrizable para reporte y diplomas por suscriptor."),
];

// ─── 4. Multilenguaje ─────────────────────────────────────────────────
const langTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1400, 2400, 5560],
  rows: [
    headerRow(["Código", "Idioma", "Cobertura geográfica"], [1400, 2400, 5560]),
    ["es", "Español", "LATAM (Colombia, México, Centroamérica, Cono Sur) y España"],
    ["en", "English", "Estados Unidos, Reino Unido, Canadá, Caribe anglófono"],
    ["pt", "Português", "Brasil, Portugal, Angola, Mozambique"],
    ["fr", "Français", "Francia, Bélgica, Suiza, Canadá francés"],
    ["it", "Italiano", "Italia, Suiza italiana, San Marino"],
    ["de", "Deutsch", "Alemania, Austria, Suiza alemana, Liechtenstein"],
  ]
    .slice(1)
    .map(
      (row) =>
        new TableRow({
          children: [
            cell(row[0], { width: 1400, bold: true, fill: NAVY_SOFT }),
            cell(row[1], { width: 2400, bold: true }),
            cell(row[2], { width: 5560 }),
          ],
        })
    ),
});

const multilang = [
  h("4. Cobertura multilenguaje", HeadingLevel.HEADING_1),
  p(
    "La plataforma soporta seis idiomas con cobertura del 100 % en las 382 entradas del diccionario centralizado. El usuario elige idioma desde un switcher en el header (con bandera + nombre nativo) que persiste la preferencia en cookie por un año."
  ),
  langTable,
  blank(),
  callout(
    "Fallback inteligente",
    "Si una traducción puntual no existe para el idioma seleccionado, la cascada degrada a inglés y solo si falta también baja a español. Esto evita que un usuario francés vea aleatoriamente cadenas en español por una key sin traducir."
  ),
  h("4.1 Superficies traducidas", HeadingLevel.HEADING_2),
  bullet("Landing comercial (/): hero, micro-formulario, secciones de prueba social, beneficios, perfiles, pasos del proceso, comparativa, FAQ, testimonios, ROI y CTAs finales."),
  bullet("Página de registro (/registro): formulario completo, hints, mensajes de error, mensaje de éxito y selector de certificación."),
  bullet("Portal del candidato: títulos de página, KPIs, estados de inscripción, wizard de 4 pasos, empty states."),
  bullet("Selector de idioma persistente en header del landing, en /registro y en el header del DashboardShell (portal, panel, admin)."),
];

// ─── 5. Cumplimiento legal: Habeas Data ───────────────────────────────
const habeasData = [
  h("5. Cumplimiento legal — Habeas Data", HeadingLevel.HEADING_1),
  p(
    "El registro del candidato implementa la Ley 1581 de 2012 (régimen general de protección de datos personales en Colombia) y su Decreto 1377 de 2013."
  ),
  bullet("Consentimiento explícito visible y separado del envío del formulario; checkbox obligatorio."),
  bullet("Versión de política versionada (v2026-06-05) almacenada con cada autorización."),
  bullet("Persistencia en DataConsent con IP, User-Agent y hash SHA-256 del snapshot completo del consentimiento — evidencia legal verificable."),
  bullet("Generación automática de un PDF firmado con la autorización, recibido por el titular al correo registrado."),
  bullet("Copia obligatoria a gerencia@risksint.com y formacion@risksint.com en BCC para trazabilidad del organismo."),
  bullet("Página pública /privacidad con habeas data interactivo (qué se trata, finalidades, derechos del titular, canales de revocación)."),
  bullet("Política de seguridad: nunca se exponen claves de API; los soportes se almacenan en object storage con URLs firmadas SHA-256."),
];

// ─── 6. ONAC ──────────────────────────────────────────────────────────
const onac = [
  h("6. Respaldo institucional — ONAC", HeadingLevel.HEADING_1),
  // Duo visual de logos: RISKS × ONAC, como aparece en el diploma y en
  // los headers públicos de la plataforma.
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 200 },
    children: [
      new ImageRun({
        type: "png",
        data: LOGO_RISKS,
        transformation: { width: 80, height: 62 },
        altText: { title: "RISKS", description: "RISKS INTERNATIONAL", name: "risks-onac-duo-1" },
      }),
      new TextRun({
        text: "     ×     ",
        color: SLATE_500,
        size: 28,
        font: HEADING_FONT,
        bold: true,
      }),
      new ImageRun({
        type: "png",
        data: LOGO_ONAC,
        transformation: { width: 56, height: 56 },
        altText: { title: "ONAC", description: "ONAC", name: "risks-onac-duo-2" },
      }),
    ],
  }),
  p(
    "RISKS INTERNATIONAL está en proceso de acreditación ante el Organismo Nacional de Acreditación de Colombia (ONAC) como Organismo de Certificación de Personas bajo la norma ISO/IEC 17024."
  ),
  bullet("Logo ONAC con wordmark completo y fuente embebida en footer público, panel y diploma."),
  bullet("Leyenda “En proceso de acreditación” mostrada con transparencia en todas las superficies relevantes."),
  bullet("Footer público con justificación a la derecha y hora legal colombiana."),
  bullet("Diploma con doble logo (organismo certificador + ONAC), sello dorado, micro-seguridad y QR público."),
  bullet("Página /verificar con búsqueda por código o por número de documento, mostrando logos del organismo y de ONAC con la leyenda correspondiente."),
];

// ─── 7. Verificación pública ──────────────────────────────────────────
const verification = [
  h("7. Verificación pública por QR", HeadingLevel.HEADING_1),
  p(
    "Cada certificado emitido lleva un código único y un código QR que cualquier tercero (empresa, reclutador, ente de control) puede escanear con su teléfono para verificar la autenticidad en segundos."
  ),
  bullet("URL pública del tipo okacreditado.com/verificar/{código} con página propia por certificado."),
  bullet("La página muestra: nombre del titular, programa, vigencia, estado (VÁLIDO / VENCIDO / REVOCADO), logos del organismo y de ONAC."),
  bullet("Descarga del PDF del certificado disponible desde la propia página de verificación."),
  bullet("La verificación no requiere registro ni cuenta — está pensada para la apertura máxima al verificador externo."),
  bullet("Búsqueda alternativa por número de documento en /verificar para casos en que no se tenga el código."),
];

// ─── 8. Anexo técnico ─────────────────────────────────────────────────
const techStack = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3000, 6360],
  rows: [
    headerRow(["Capa", "Tecnología"], [3000, 6360]),
    ...[
      ["Framework", "Next.js 15 (App Router) con Server Components y Server Actions"],
      ["Base de datos", "PostgreSQL en Railway, multitenant por fila con RLS"],
      ["ORM", "Prisma"],
      ["Hosting frontend", "Vercel (despliegue automático desde main)"],
      ["Almacenamiento de archivos", "Object Storage S3 en Railway con URLs firmadas SHA-256"],
      ["Pagos online", "Rapyd con claves por suscriptor + webhook con firma HMAC"],
      ["Correo transaccional", "Resend con plantillas HTML + adjuntos en base64"],
      ["PDF (diploma + Hoja de Vida + Habeas Data)", "pdf-lib con fuentes embebidas + QR code"],
      ["Estilos", "Tailwind v4 con paleta brand (navy + dorado) parametrizable"],
      ["Seguridad", "Headers de hardening, RLS por suscriptor, antifraude en examen"],
    ].map(
      (row) =>
        new TableRow({
          children: [
            cell(row[0], { width: 3000, bold: true, fill: NAVY_SOFT }),
            cell(row[1], { width: 6360 }),
          ],
        })
    ),
  ],
});

const techAnnex = [
  h("8. Anexo técnico", HeadingLevel.HEADING_1),
  p("Resumen de la pila tecnológica desplegada en producción:"),
  techStack,
];

// ─── 9. Cierre ────────────────────────────────────────────────────────
const closing = [
  h("9. Cierre y verificación del proceso", HeadingLevel.HEADING_1),
  p(
    "El proceso descrito está operativo en producción en https://www.okacreditado.com. Cada paso —desde el registro hasta la emisión— deja huella auditable: snapshots de consentimiento, hashes de archivos, registros de presentación de examen, votos del comité y firma del certificado."
  ),
  p(
    "Para validar un certificado emitido, cualquier tercero puede escanear el QR del diploma o visitar okacreditado.com/verificar e ingresar el código o el número de documento del titular."
  ),
  callout(
    "Compromiso del organismo",
    "Cada certificado emitido por RISKS INTERNATIONAL S.A.S. lleva el respaldo de más de una década operando SARLAFT, SAGRILAFT y debida diligencia desde dentro de las empresas vigiladas — y el respaldo institucional del proceso de acreditación ante ONAC bajo la norma ISO/IEC 17024."
  ),
];

// ─── Documento final ──────────────────────────────────────────────────
const doc = new Document({
  creator: "RISKS INTERNATIONAL S.A.S.",
  title: "Proceso de Certificación CIOC",
  description: "Documento descriptivo del proceso de certificación okacreditado.com",
  styles: {
    default: {
      document: { run: { font: BODY_FONT, size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: HEADING_FONT, color: NAVY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: HEADING_FONT, color: NAVY_MID },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: HEADING_FONT, color: GOLD },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    // Portada
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: M, right: M, bottom: M, left: M },
        },
      },
      children: cover,
    },
    // Cuerpo con encabezado y pie
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: M + 360, right: M, bottom: M + 360, left: M },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 },
              },
              children: [
                new ImageRun({
                  type: "png",
                  data: LOGO_RISKS,
                  transformation: { width: 32, height: 25 },
                  altText: {
                    title: "RISKS",
                    description: "RISKS INTERNATIONAL",
                    name: "risks-mini",
                  },
                }),
                new TextRun({
                  text: "  RISKS INTERNATIONAL · Proceso de Certificación CIOC",
                  size: 18,
                  font: HEADING_FONT,
                  color: NAVY,
                  bold: true,
                }),
                new TextRun({
                  text: "\twww.okacreditado.com",
                  size: 18,
                  font: BODY_FONT,
                  color: SLATE_500,
                }),
              ],
              tabStops: [
                { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: SLATE_200, space: 4 },
              },
              children: [
                new TextRun({
                  text: "Página ",
                  size: 18,
                  font: BODY_FONT,
                  color: SLATE_500,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                  font: BODY_FONT,
                  color: NAVY,
                  bold: true,
                }),
                new TextRun({
                  text: " de ",
                  size: 18,
                  font: BODY_FONT,
                  color: SLATE_500,
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 18,
                  font: BODY_FONT,
                  color: NAVY,
                  bold: true,
                }),
                new TextRun({
                  text: "  ·  Confidencial — Uso interno y de candidatos",
                  size: 18,
                  font: BODY_FONT,
                  color: SLATE_500,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...tocSection,
        ...intro,
        ...stepsSection,
        ...stepsDetail,
        h("3. Módulos por rol", HeadingLevel.HEADING_1),
        p(
          "La plataforma divide la operación en tres áreas con permisos y vistas dedicadas. Cada área tiene su propio sidebar, header y conjunto de funcionalidades."
        ),
        ...candidateModule,
        ...subscriberModule,
        ...adminModule,
        ...multilang,
        ...habeasData,
        ...onac,
        ...verification,
        ...techAnnex,
        ...closing,
      ],
    },
  ],
});

const outDir = path.join(__dirname);
const outFile = path.join(outDir, "Proceso-Certificacion-okacreditado.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outFile, buf);
  console.log(`✓ Documento generado: ${outFile} (${(buf.length / 1024).toFixed(1)} KB)`);
});
