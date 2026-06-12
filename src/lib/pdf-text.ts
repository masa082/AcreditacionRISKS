import "server-only";

/**
 * Normalización defensiva de texto para pdf-lib + StandardFonts (Helvetica,
 * Times, Courier).
 *
 * Las fuentes "standard" de PDF usan el encoding WinAnsi (Windows-1252),
 * que NO soporta:
 *   - Marcas combinantes Unicode (U+0300–U+036F). Por ejemplo, el acento
 *     agudo combinante U+0301 que aparece cuando un texto está en NFD
 *     (e + combining acute) en vez de la forma precompuesta NFC (é).
 *   - Caracteres no-Latin-1 (CJK, hebreo, árabe, emojis).
 *   - Comillas curvas y otros signos Unicode comunes en copy-paste de
 *     web/Office (curly quotes, en/em dashes, ellipsis, NBSP, etc.).
 *
 * Si pdf-lib recibe uno de estos caracteres lanza
 *   "WinAnsi cannot encode (X) (0xNNNN)"
 * y rompe la generación del PDF completo.
 *
 * `safeText` hace 4 pasos:
 *   1. NFC: precompone marcas combinantes en su forma única encodable.
 *   2. Map de transliteración para signos Unicode comunes (comillas
 *      curvas, guiones largos, puntos suspensivos, espacios no-rompibles).
 *      Las claves se escriben con \uXXXX para no depender del encoding
 *      del fichero fuente.
 *   3. Quita cualquier marca combinante residual.
 *   4. Filtro final: cualquier codepoint > 0xFF (fuera de Latin-1) que
 *      sobreviva se reemplaza por "?" — perdemos el carácter exótico
 *      pero NO rompemos el PDF entero.
 *
 * El día que migremos a una fuente TTF embebida con fontkit este helper
 * se vuelve un no-op (pdf-lib aceptará cualquier Unicode).
 */
const TRANSLITERATE: Record<string, string> = {
  " ": " ",   // NBSP (no-break space) → espacio normal
  " ": " ",   // thin space
  " ": " ",   // hair space
  "​": "",    // zero-width space
  "‘": "'",   // left single quote ‘
  "’": "'",   // right single quote ’
  "‚": "'",   // single low-9 ‚
  "“": '"',   // left double quote “
  "”": '"',   // right double quote ”
  "„": '"',   // double low-9 „
  "–": "-",   // en dash –
  "—": "-",   // em dash —
  "―": "-",   // horizontal bar ―
  "…": "...", // ellipsis …
  "•": "-",   // bullet •
  "·": "-",   // middle dot ·
  "«": '"',   // « guillemet
  "»": '"',   // » guillemet
};

// Conjunto explícito para el regex de transliteración — compone la
// alternancia desde las claves del map para no repetir caracteres.
const TRANSLITERATE_RX = new RegExp(
  "[" +
    Object.keys(TRANSLITERATE)
      .map((c) => c.replace(/[\\\]\-\^]/g, "\\$&"))
      .join("") +
    "]",
  "g",
);

// Rango Unicode de "Combining Diacritical Marks" (U+0300–U+036F).
const COMBINING_MARKS_RX = /[̀-ͯ]/g;

// Cualquier codepoint fuera del rango Latin-1 (0x00–0xFF).
const NON_LATIN1_RX = /[^\x00-\xFF]/g;

export function safeText(input: unknown): string {
  if (input == null) return "";
  let s = String(input);
  try {
    s = s.normalize("NFC");
  } catch {
    /* runtime sin Intl/Unicode */
  }
  s = s.replace(TRANSLITERATE_RX, (c) => TRANSLITERATE[c] ?? c);
  s = s.replace(COMBINING_MARKS_RX, "");
  s = s.replace(NON_LATIN1_RX, "?");
  return s;
}
