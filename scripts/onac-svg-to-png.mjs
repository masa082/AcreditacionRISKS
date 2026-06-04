// Pre-renderiza /public/onac-logo.svg a /public/onac-logo.png con fondo
// transparente, en alta resolución (1200px de ancho) para que el embed
// del PDF y el de cualquier visor luzca nítido. Se ejecuta una sola vez,
// el resultado queda versionado en /public.
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

const svg = readFileSync(svgPath, "utf8");

// Carga del WASM de resvg
const resvgWasm = await import("@resvg/resvg-wasm");
const wasmPath = resolve(ROOT, "node_modules/@resvg/resvg-wasm/index_bg.wasm");
await resvgWasm.initWasm(readFileSync(wasmPath));

const r = new resvgWasm.Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: "rgba(255,255,255,0)", // fondo transparente
  font: { loadSystemFonts: true },
});
const pngData = r.render().asPng();
writeFileSync(pngPath, pngData);

console.log(`✓ ${pngPath} generado (${pngData.length} bytes)`);
