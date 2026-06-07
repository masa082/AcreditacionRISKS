/**
 * Lista de países disponibles para el registro del candidato.
 *
 * - Colombia primero (mercado principal) y luego LATAM + otros relevantes.
 * - Códigos ISO 3166-1 alpha-2 (estándar de la industria).
 * - Banderas en emoji para reconocimiento visual rápido (Unicode regional).
 *
 * Cuando el país seleccionado es CO, el LocationPicker activa el modo
 * "DANE" con departamentos + municipios reales del país. Para los demás,
 * cae al modo libre (texto manual de ciudad y departamento/estado).
 */
export interface Country {
  code: string;       // ISO 3166-1 alpha-2
  name: string;       // nombre en español
  dial: string;       // prefijo telefónico
  flag: string;       // emoji bandera
}

export const COUNTRIES: Country[] = [
  // Mercado principal arriba para acceso de 1 clic
  { code: "CO", name: "Colombia",           dial: "+57",  flag: "🇨🇴" },
  // LATAM
  { code: "AR", name: "Argentina",          dial: "+54",  flag: "🇦🇷" },
  { code: "BO", name: "Bolivia",            dial: "+591", flag: "🇧🇴" },
  { code: "BR", name: "Brasil",             dial: "+55",  flag: "🇧🇷" },
  { code: "CL", name: "Chile",              dial: "+56",  flag: "🇨🇱" },
  { code: "CR", name: "Costa Rica",         dial: "+506", flag: "🇨🇷" },
  { code: "CU", name: "Cuba",               dial: "+53",  flag: "🇨🇺" },
  { code: "DO", name: "República Dominicana", dial: "+1", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador",            dial: "+593", flag: "🇪🇨" },
  { code: "SV", name: "El Salvador",        dial: "+503", flag: "🇸🇻" },
  { code: "GT", name: "Guatemala",          dial: "+502", flag: "🇬🇹" },
  { code: "HN", name: "Honduras",           dial: "+504", flag: "🇭🇳" },
  { code: "MX", name: "México",             dial: "+52",  flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua",          dial: "+505", flag: "🇳🇮" },
  { code: "PA", name: "Panamá",             dial: "+507", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay",           dial: "+595", flag: "🇵🇾" },
  { code: "PE", name: "Perú",               dial: "+51",  flag: "🇵🇪" },
  { code: "PR", name: "Puerto Rico",        dial: "+1",   flag: "🇵🇷" },
  { code: "UY", name: "Uruguay",            dial: "+598", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela",          dial: "+58",  flag: "🇻🇪" },
  // Otros relevantes
  { code: "US", name: "Estados Unidos",     dial: "+1",   flag: "🇺🇸" },
  { code: "CA", name: "Canadá",             dial: "+1",   flag: "🇨🇦" },
  { code: "ES", name: "España",             dial: "+34",  flag: "🇪🇸" },
  { code: "PT", name: "Portugal",           dial: "+351", flag: "🇵🇹" },
  { code: "FR", name: "Francia",            dial: "+33",  flag: "🇫🇷" },
  { code: "IT", name: "Italia",             dial: "+39",  flag: "🇮🇹" },
  { code: "DE", name: "Alemania",           dial: "+49",  flag: "🇩🇪" },
  { code: "UK", name: "Reino Unido",        dial: "+44",  flag: "🇬🇧" },
  { code: "OTHER", name: "Otro país",       dial: "",     flag: "🌐" },
];

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
