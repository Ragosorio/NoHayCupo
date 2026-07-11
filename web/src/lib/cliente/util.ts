/** Utilidades compartidas del frontend (puerto de las de app.js). */

export const DIAS_ORDEN = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"] as const;
export const DIAS_NOMBRE: Record<string, string> = {
  LU: "Lunes", MA: "Martes", MI: "Miércoles", JU: "Jueves",
  VI: "Viernes", SA: "Sábado", DO: "Domingo",
};
export const DIAS_CORTO: Record<string, string> = {
  LU: "L", MA: "M", MI: "X", JU: "J", VI: "V", SA: "S", DO: "D",
};

// Rejilla de bloqueos: celdas de 30 min, de 06:30 a 21:30
export const SLOT_MIN = 30;
export const GRID_INI = 6 * 60 + 30;
export const GRID_FIN = 21 * 60 + 30;

/* Paletas por curso [fondo, borde, tinta] — validadas para ambos temas. */
export const PALETA_CLARA: Array<[string, string, string]> = [
  ["#eef0fe", "#4f46e5", "#312e81"],
  ["#e6f6f4", "#0d9488", "#134e4a"],
  ["#fdf1e2", "#d97706", "#713f12"],
  ["#fdeaef", "#db2777", "#831843"],
  ["#f0f7e8", "#65a30d", "#365314"],
  ["#e8f3fd", "#0284c7", "#0c4a6e"],
  ["#feeceb", "#dc2626", "#7f1d1d"],
  ["#f0ecfd", "#7c3aed", "#4c1d95"],
];
export const PALETA_OSCURA: Array<[string, string, string]> = [
  ["#1d2140", "#6366f1", "#c7d2fe"],
  ["#12262c", "#0d9488", "#99f6e4"],
  ["#2a2214", "#d97706", "#fde68a"],
  ["#2b1a2b", "#ec4899", "#fbcfe8"],
  ["#1c2416", "#65a30d", "#d9f99d"],
  ["#122336", "#0284c7", "#bae6fd"],
  ["#2b181d", "#ef4444", "#fecaca"],
  ["#221d3d", "#8b5cf6", "#ddd6fe"],
];

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const aHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const nombreBonito = (s: string) =>
  s.toLowerCase().replace(/(^|[\s.·(-])\p{L}/gu, (c) => c.toUpperCase());

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: A) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const PERIODOS: Array<{ valor: string; nombre: string }> = [
  { valor: "1", nombre: "Primer semestre" },
  { valor: "2", nombre: "Segundo semestre" },
  { valor: "v1", nombre: "Vacaciones junio" },
  { valor: "v2", nombre: "Vacaciones diciembre" },
];

export const nombrePeriodo = (valor: string) =>
  PERIODOS.find((p) => p.valor === valor)?.nombre ?? valor;

export const ORDINAL_SEM = ["", "Primer", "Segundo", "Tercer", "Cuarto", "Quinto",
  "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];
