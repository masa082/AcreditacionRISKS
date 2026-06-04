import "server-only";

/// Tokens de marca usados en el PDF de Hoja de Vida y en el Diploma.
/// Cada suscriptor puede sobreescribirlos desde /panel/organizacion;
/// el helper resolveTheme() devuelve la mezcla del default + lo que el
/// suscriptor haya configurado en su columna `themeConfig`.
export interface ReportTheme {
  /** Color de títulos de sección, nombre del titular y texto principal. */
  primary: string;       // navy
  /** Color de acento — líneas, separadores, badge "EN PROCESO DE…". */
  accent: string;        // dorado
  /** Fondo de la franja del encabezado (claro para que cualquier logo se vea). */
  headerBg: string;      // crema
  /** Fondo de la franja por sección (rect detrás del title). */
  sectionBg: string;     // azul muy claro
  /** Color del texto del title de sección. */
  sectionText: string;
  /** Color de los separadores/ líneas internas (rules) en gris suave. */
  rule: string;
  /** Texto de cuerpo (gris muy oscuro). */
  body: string;
  /** Texto auxiliar (gris medio para etiquetas, fechas, etc.). */
  muted: string;
}

/// Paleta institucional CIOC por defecto: navy + dorado + crema.
/// Se mantiene como fallback para que los suscriptores que aún no han
/// personalizado su tema vean exactamente lo mismo que antes.
export const DEFAULT_THEME: ReportTheme = {
  primary:     "#0b1d44",
  accent:      "#c89a35",
  headerBg:    "#fdfbf4",
  sectionBg:   "#f1f6ff",
  sectionText: "#0b1d44",
  rule:        "#d9dde6",
  body:        "#0f172a",
  muted:       "#64748b",
};

/// Valida y mezcla la paleta del suscriptor sobre el default.
/// Solo acepta strings con formato "#rrggbb" o "#rgb"; ignora valores
/// inválidos para no romper el render.
export function resolveTheme(raw: unknown): ReportTheme {
  if (!raw || typeof raw !== "object") return DEFAULT_THEME;
  const src = raw as Record<string, unknown>;
  const isHex = (v: unknown): v is string =>
    typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
  const pick = (k: keyof ReportTheme): string => {
    const v = src[k];
    return isHex(v) ? v.trim() : DEFAULT_THEME[k];
  };
  return {
    primary:     pick("primary"),
    accent:      pick("accent"),
    headerBg:    pick("headerBg"),
    sectionBg:   pick("sectionBg"),
    sectionText: pick("sectionText"),
    rule:        pick("rule"),
    body:        pick("body"),
    muted:       pick("muted"),
  };
}

/// Conversión hex → tupla rgb en el rango 0..1 que espera pdf-lib.
export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}
