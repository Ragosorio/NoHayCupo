/** Modelo de datos de NoHayCupo — puerto 1:1 de engine/models.py.
 *
 * Regla de la capa: este módulo (y todo lib/engine) es TypeScript puro:
 * sin red, sin DOM, sin Astro. Corre igual en el navegador que en tests.
 */

export const DIAS_SEMANA = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"] as const;
export type Dia = (typeof DIAS_SEMANA)[number];
export const DIAS_LABORALES: Dia[] = ["LU", "MA", "MI", "JU", "VI"];

/** Etiqueta usada para el componente de clase magistral (categoria=null). */
export const COMPONENTE_CLASE = "Clase";

export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) throw new Error(`hora inválida: ${s}`);
  return h * 60 + m;
}

export function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Devuelve los días en orden de la semana (LU primero). */
export function ordenarDias(dias: Iterable<string>): Dia[] {
  return [...dias].sort(
    (a, b) => DIAS_SEMANA.indexOf(a as Dia) - DIAS_SEMANA.indexOf(b as Dia),
  ) as Dia[];
}

/** Una fila de la tabla de horarios, ya normalizada.
 * `dias` se guarda SIEMPRE ordenado (equivale al frozenset de Python:
 * la igualdad de horario se compara con la clave canónica de abajo). */
export interface Seccion {
  curso_codigo: string;
  curso_nombre: string;
  seccion: string;
  /** null = clase magistral; "Laboratorio", "Práctica", "Trabajo Dirigido" o "Dibujo". */
  categoria: string | null;
  modalidad: string;
  inicio_min: number | null;
  fin_min: number | null;
  dias: Dia[];
  catedratico: string;
  auxiliar: string | null;
  restringida: boolean;
}

export function tieneHorario(s: Seccion): boolean {
  return s.inicio_min !== null && s.fin_min !== null &&
    s.fin_min > s.inicio_min && s.dias.length > 0;
}

export interface Curso {
  codigo: string;
  nombre: string;
  secciones_clase: Seccion[];
  /** {categoria -> secciones}; un curso puede tener Práctica Y Laboratorio. */
  componentes_practicos: Map<string, Seccion[]>;
}

export function todasLasSecciones(c: Curso): Seccion[] {
  const out = [...c.secciones_clase];
  for (const secs of c.componentes_practicos.values()) out.push(...secs);
  return out;
}

/** Un bloque de tiempo recurrente: ej. Martes y Jueves 07:10-08:50. */
export interface Sesion {
  inicio_min: number;
  fin_min: number;
  dias: Dia[];
}

/** Un componente elegido dentro de una opción (la clase, o un lab/práctica),
 * con sus secciones equivalentes (mismo horario, distinto catedrático). */
export interface Componente {
  categoria: string;
  sesion: Sesion;
  secciones: Seccion[];
}

/** Una alternativa concreta e inscribible para un curso. */
export interface Opcion {
  componentes: Componente[];
}

export function sesionesDe(op: Opcion): Sesion[] {
  return op.componentes.map((c) => c.sesion);
}

export function etiquetaDe(op: Opcion): string {
  return op.componentes
    .map((c) =>
      `${c.categoria} ${c.secciones[0].seccion} · ${c.sesion.dias.join(" ")} ` +
      `${minToHHMM(c.sesion.inicio_min)}–${minToHHMM(c.sesion.fin_min)}`)
    .join("  +  ");
}
