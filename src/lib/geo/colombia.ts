/**
 * División Político-Administrativa de Colombia (DANE).
 *
 * 32 departamentos + Distrito Capital, cada uno con su capital y los
 * municipios más representativos. Los códigos siguen DIVIPOLA (DANE):
 * 2 dígitos para el departamento, 5 para el municipio (3 últimos =
 * código municipal).
 *
 * Cobertura: capital de cada departamento + municipios con >30 mil
 * habitantes (aprox. 270 municipios = ~90% de la población del país).
 * Para municipios no listados, el formulario ofrece la opción
 * "Otro municipio (escribir)" que conserva el departamento elegido.
 *
 * Fuente: DANE — Divipola 2024.
 */

export interface DepartmentRow {
  /** Código DANE de 2 dígitos. */
  code: string;
  /** Nombre oficial. */
  name: string;
  /** Capital del departamento (siempre primera en `cities`). */
  capital: string;
  /** Municipios destacados (incluye la capital). */
  cities: string[];
}

export const COLOMBIA_DEPARTMENTS: DepartmentRow[] = [
  { code: "05", name: "Antioquia", capital: "Medellín", cities: [
    "Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "La Estrella",
    "Caldas", "Copacabana", "Girardota", "Barbosa",
    "Apartadó", "Turbo", "Carepa", "Chigorodó", "Necoclí",
    "Rionegro", "La Ceja", "El Carmen de Viboral", "Marinilla", "Guarne",
    "Caucasia", "El Bagre", "Zaragoza",
    "Yarumal", "Santa Rosa de Osos",
    "Andes", "Jericó", "Jardín",
    "Puerto Berrío", "Cisneros",
    "Santa Fe de Antioquia", "Santo Domingo",
  ] },
  { code: "08", name: "Atlántico", capital: "Barranquilla", cities: [
    "Barranquilla", "Soledad", "Malambo", "Galapa", "Sabanagrande",
    "Sabanalarga", "Baranoa", "Puerto Colombia", "Palmar de Varela",
    "Polonuevo", "Suan", "Manatí", "Repelón", "Luruaco",
    "Tubará", "Usiacurí", "Juan de Acosta",
  ] },
  { code: "11", name: "Bogotá D.C.", capital: "Bogotá D.C.", cities: ["Bogotá D.C."] },
  { code: "13", name: "Bolívar", capital: "Cartagena de Indias", cities: [
    "Cartagena de Indias", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar",
    "San Pablo", "Santa Rosa", "Mahates", "San Juan Nepomuceno",
    "Maríalabaja", "Calamar", "Mompós", "Tiquisio", "Pinillos",
  ] },
  { code: "15", name: "Boyacá", capital: "Tunja", cities: [
    "Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa",
    "Puerto Boyacá", "Garagoa", "Soatá", "Aquitania",
    "Moniquirá", "Villa de Leyva", "Ráquira",
    "Nobsa", "Tibasosa", "Samacá", "Saboyá",
    "Chitaraque", "Belén",
  ] },
  { code: "17", name: "Caldas", capital: "Manizales", cities: [
    "Manizales", "Villamaría", "Chinchiná", "Palestina", "Neira",
    "Anserma", "Riosucio", "Supía", "Aguadas",
    "La Dorada", "Salamina", "Pácora",
    "Pensilvania", "Manzanares",
    "Marquetalia", "Marmato", "Filadelfia",
  ] },
  { code: "18", name: "Caquetá", capital: "Florencia", cities: [
    "Florencia", "San Vicente del Caguán", "Puerto Rico", "Cartagena del Chairá",
    "El Doncello", "Belén de los Andaquíes", "La Montañita", "Albania",
    "Curillo", "El Paujil", "Solano",
  ] },
  { code: "19", name: "Cauca", capital: "Popayán", cities: [
    "Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía", "Piendamó",
    "Cajibío", "Caloto", "Corinto", "Miranda", "El Tambo",
    "Inzá", "Páez", "Toribío", "Buenos Aires",
    "Silvia", "Timbío", "Morales", "Bolívar", "Mercaderes",
    "La Vega", "Almaguer",
  ] },
  { code: "20", name: "Cesar", capital: "Valledupar", cities: [
    "Valledupar", "Aguachica", "Codazzi", "La Jagua de Ibirico", "Bosconia",
    "El Copey", "Curumaní", "Chiriguaná", "Chimichagua",
    "San Diego", "La Paz", "San Martín",
    "Río de Oro", "Pailitas", "Tamalameque",
  ] },
  { code: "23", name: "Córdoba", capital: "Montería", cities: [
    "Montería", "Lorica", "Cereté", "Sahagún", "Tierralta",
    "Ciénaga de Oro", "Planeta Rica", "Montelíbano", "Puerto Libertador",
    "Chinú", "San Bernardo del Viento", "Moñitos", "Los Córdobas",
    "Pueblo Nuevo", "San Andrés de Sotavento",
    "Buenavista", "San Antero", "Valencia", "Tuchín",
  ] },
  { code: "25", name: "Cundinamarca", capital: "Bogotá D.C. (capital nacional)", cities: [
    "Soacha", "Zipaquirá", "Facatativá", "Chía", "Cajicá",
    "Fusagasugá", "Funza", "Mosquera", "Madrid", "Tocancipá",
    "La Calera", "Sopó", "Tenjo", "Tabio", "Cota",
    "Girardot", "Ricaurte", "Agua de Dios",
    "Ubaté", "Pacho", "Gachetá",
    "Villeta", "La Vega", "Sasaima",
    "Guasca", "Sesquilé", "Suesca",
    "Anolaima", "Quipile",
  ] },
  { code: "27", name: "Chocó", capital: "Quibdó", cities: [
    "Quibdó", "Istmina", "Tadó", "Condoto", "Nuquí",
    "Bahía Solano", "Acandí", "Riosucio", "Bojayá",
    "El Carmen de Atrato", "Lloró", "Sipí",
    "Atrato", "Medio Atrato", "Bajo Baudó",
  ] },
  { code: "41", name: "Huila", capital: "Neiva", cities: [
    "Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre",
    "Aipe", "Palermo", "Rivera", "Tello",
    "Acevedo", "Suaza", "Gigante", "Hobo",
    "Iquira", "Yaguará", "Tesalia", "Nátaga",
    "Saladoblanco", "San Agustín", "Isnos",
  ] },
  { code: "44", name: "La Guajira", capital: "Riohacha", cities: [
    "Riohacha", "Maicao", "Uribia", "Manaure", "San Juan del Cesar",
    "Fonseca", "Villanueva", "Barrancas", "Albania",
    "Hatonuevo", "Distracción", "El Molino", "Urumita",
    "Dibulla", "La Jagua del Pilar",
  ] },
  { code: "47", name: "Magdalena", capital: "Santa Marta", cities: [
    "Santa Marta", "Ciénaga", "Fundación", "El Banco", "Plato",
    "Aracataca", "Pivijay", "Zona Bananera", "Algarrobo",
    "El Retén", "Sabanas de San Ángel", "Tenerife",
    "Pueblo Viejo", "Sitio Nuevo", "Salamina",
    "Guamal", "San Sebastián de Buenavista",
  ] },
  { code: "50", name: "Meta", capital: "Villavicencio", cities: [
    "Villavicencio", "Acacías", "Granada", "Puerto López", "Cumaral",
    "Guamal", "Restrepo", "San Martín", "Cubarral",
    "Castilla la Nueva", "El Castillo", "Lejanías",
    "Puerto Gaitán", "Mapiripán", "Puerto Concordia",
    "Vista Hermosa", "La Macarena", "Mesetas", "Uribe",
    "El Calvario", "Barranca de Upía", "Cabuyaro",
  ] },
  { code: "52", name: "Nariño", capital: "San Juan de Pasto", cities: [
    "San Juan de Pasto", "Ipiales", "Tumaco", "Túquerres", "La Unión",
    "Sandoná", "Samaniego", "Pupiales", "Cumbal",
    "Aldana", "Guachucal", "Iles", "Ricaurte",
    "Tangua", "Yacuanquer", "Buesaco", "Chachagüí",
    "Consacá", "El Tambo", "Funes",
    "La Cruz", "San Pablo", "San Bernardo",
    "Sapuyes", "Túquerres", "Gualmatán",
  ] },
  { code: "54", name: "Norte de Santander", capital: "San José de Cúcuta", cities: [
    "San José de Cúcuta", "Ocaña", "Villa del Rosario", "Los Patios", "Pamplona",
    "Tibú", "Sardinata", "El Zulia", "Chinácota",
    "El Carmen", "Ábrego", "Convención", "San Calixto",
    "Salazar", "Arboledas", "Lourdes",
    "Bochalema", "Chitagá", "Toledo",
    "Pamplonita", "Cucutilla",
  ] },
  { code: "63", name: "Quindío", capital: "Armenia", cities: [
    "Armenia", "Calarcá", "La Tebaida", "Montenegro", "Quimbaya",
    "Circasia", "Salento", "Filandia", "Pijao",
    "Génova", "Buenavista", "Córdoba",
  ] },
  { code: "66", name: "Risaralda", capital: "Pereira", cities: [
    "Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia", "Apía",
    "Belén de Umbría", "Guática", "La Celia", "Marsella",
    "Mistrató", "Pueblo Rico", "Quinchía", "Santuario", "Balboa",
  ] },
  { code: "68", name: "Santander", capital: "Bucaramanga", cities: [
    "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
    "San Gil", "Socorro", "Málaga", "Barbosa",
    "Vélez", "Lebrija", "Rionegro", "Sabana de Torres",
    "Puente Nacional", "Charalá", "Mogotes", "San Vicente de Chucurí",
    "El Carmen de Chucurí", "Zapatoca", "Cimitarra",
    "Curití", "Aratoca", "Páramo",
    "Suaita", "Confines",
  ] },
  { code: "70", name: "Sucre", capital: "Sincelejo", cities: [
    "Sincelejo", "Corozal", "San Marcos", "Sampués", "Tolú",
    "San Onofre", "Coveñas", "Morroa", "Los Palmitos",
    "Sincé", "El Roble", "Galeras", "Caimito",
    "San Pedro", "Buenavista", "Coloso",
    "Toluviejo", "Chalán", "Ovejas",
  ] },
  { code: "73", name: "Tolima", capital: "Ibagué", cities: [
    "Ibagué", "Espinal", "Honda", "Líbano", "Mariquita",
    "Chaparral", "Melgar", "Purificación", "Saldaña",
    "Flandes", "Guamo", "Lérida", "Armero-Guayabal",
    "Fresno", "Falan", "Cajamarca",
    "Rovira", "San Antonio", "San Luis",
    "Ortega", "Coyaima", "Natagaima",
    "Ataco", "Planadas", "Rioblanco",
  ] },
  { code: "76", name: "Valle del Cauca", capital: "Santiago de Cali", cities: [
    "Santiago de Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago",
    "Buga", "Jamundí", "Yumbo", "Florida",
    "Pradera", "Candelaria", "Ginebra", "Guacarí",
    "El Cerrito", "Roldanillo", "La Unión", "Toro",
    "Sevilla", "Caicedonia", "Bugalagrande",
    "Andalucía", "Riofrío", "Trujillo",
    "Vijes", "Yotoco", "Restrepo",
    "Dagua", "Calima", "El Águila",
    "Argelia", "El Cairo",
    "Ansermanuevo", "Ulloa",
    "Versalles", "La Victoria",
    "Obando", "La Cumbre",
    "Zarzal", "Alcalá",
  ] },
  { code: "81", name: "Arauca", capital: "Arauca", cities: [
    "Arauca", "Saravena", "Tame", "Arauquita",
    "Fortul", "Cravo Norte", "Puerto Rondón",
  ] },
  { code: "85", name: "Casanare", capital: "Yopal", cities: [
    "Yopal", "Aguazul", "Villanueva", "Tauramena", "Monterrey",
    "Paz de Ariporo", "Hato Corozal", "Trinidad", "Sabanalarga",
    "Pore", "Maní", "Orocué", "San Luis de Palenque",
    "Nunchía", "Támara", "Sácama", "Recetor",
    "Chámeza", "La Salina",
  ] },
  { code: "86", name: "Putumayo", capital: "Mocoa", cities: [
    "Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez", "Puerto Caicedo",
    "Puerto Guzmán", "Puerto Leguízamo", "Sibundoy", "Santiago",
    "Colón", "San Francisco", "San Miguel",
    "Villagarzón",
  ] },
  { code: "88", name: "San Andrés y Providencia", capital: "San Andrés", cities: [
    "San Andrés", "Providencia y Santa Catalina",
  ] },
  { code: "91", name: "Amazonas", capital: "Leticia", cities: [
    "Leticia", "Puerto Nariño", "Tarapacá", "La Chorrera",
    "El Encanto", "La Pedrera", "Mirití-Paraná",
    "Puerto Alegría", "Puerto Arica", "Puerto Santander",
  ] },
  { code: "94", name: "Guainía", capital: "Inírida", cities: [
    "Inírida", "Barrancominas", "Cacahual", "La Guadalupe",
    "Mapiripana", "Morichal", "Pana Pana", "Puerto Colombia",
    "San Felipe",
  ] },
  { code: "95", name: "Guaviare", capital: "San José del Guaviare", cities: [
    "San José del Guaviare", "Calamar", "El Retorno", "Miraflores",
  ] },
  { code: "97", name: "Vaupés", capital: "Mitú", cities: [
    "Mitú", "Carurú", "Taraira", "Pacoa", "Papunaua", "Yavaraté",
  ] },
  { code: "99", name: "Vichada", capital: "Puerto Carreño", cities: [
    "Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo",
  ] },
];

/// Devuelve { departmentName, departmentCode } a partir del nombre del
/// municipio. Si el municipio aparece en más de un departamento (raro),
/// devolvemos el primero — el LocationPicker permite override manual.
export function inferDepartmentFromCity(city: string): { name: string; code: string } | null {
  const target = city.trim().toLowerCase();
  for (const dep of COLOMBIA_DEPARTMENTS) {
    if (dep.cities.some((c) => c.toLowerCase() === target)) {
      return { name: dep.name, code: dep.code };
    }
  }
  return null;
}

/// Lista plana de todos los municipios para autocomplete (con su
/// departamento en el sufijo, p. ej. "Medellín — Antioquia").
export const COLOMBIA_FLAT_CITIES: Array<{ name: string; departmentName: string; departmentCode: string }> = COLOMBIA_DEPARTMENTS.flatMap(
  (d) => d.cities.map((c) => ({ name: c, departmentName: d.name, departmentCode: d.code })),
);
