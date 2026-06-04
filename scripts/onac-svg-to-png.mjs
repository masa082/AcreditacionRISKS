// Pre-renderiza /public/onac-logo.svg a /public/onac-logo.png con fondo
// transparente, en alta resolución (1200px de ancho) para que el embed
// del PDF y el de cualquier visor luzca nítido. Se ejecuta una sola vez,
// el resultado queda versionado en /public.
//
// resvg-wasm no tiene acceso a las fuentes del sistema en runtime de
// Vercel, así que cargamos un .ttf libre (Roboto Black/Bold, Apache 2.0)
// directamente como bytes y lo registramos con `font.fontFiles` para que
// el wordmark del logo se renderice correctamente.
//
//   node scripts/onac-svg-to-png.mjs
//
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const svgPath = resolve(ROOT, "public/onac-logo.svg");
const pngPath = resolve(ROOT, "public/onac-logo.png");
const fontBlack = resolve(__dirname, "fonts/Roboto-Black.ttf");
const fontBold  = resolve(__dirname, "fonts/Roboto-Bold.ttf");

const svg = readFileSync(svgPath, "utf8");

// Carga del WASM de resvg
const resvgWasm = await import("@resvg/resvg-wasm");
const wasmPath = resolve(ROOT, "node_modules/@resvg/resvg-wasm/index_bg.wasm");
await resvgWasm.initWasm(readFileSync(wasmPath));

const r = new resvgWasm.Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: "rgba(255,255,255,0)",
  font: {
    // Cargamos los TTF como buffers (no se puede confiar en
    // loadSystemFonts en runtime de Vercel).
    fontBuffers: [readFileSync(fontBlack), readFileSync(fontBold)],
    defaultFontFamily: "Roboto",
  },
});
const pngData = r.render().asPng();
writeFileSync(pngPath, pngData);

console.log(`✓ ${pngPath} generado (${pngData.length} bytes)`);
