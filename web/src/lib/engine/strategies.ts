/** Métricas por combinación y puntuación por estrategia.
 * Puerto 1:1 de engine/strategies.py (incluida la semántica de bloqueos:
 * «imposible» se filtra en el solver; «evitar» se minimiza aquí primero). */
import { DIAS_LABORALES, sesionesDe, type Dia, type Sesion } from "./models";
import type { Combo } from "./solver";

/** Franja del día para calcular huecos (lienzo de métricas, no restricción). */
export const DIA_INICIO_MIN = 7 * 60;
export const DIA_FIN_MIN = 19 * 60;

export interface Metrics {
  minutos_en_evitar: number;
  dias_con_clase: Dia[];
  dias_libres: Dia[];
  num_dias_con_clase: number;
  usa_sabado: boolean;
  usa_domingo: boolean;
  bloques_libres_por_dia: Record<string, number>;
  suma_bloques_libres: number;
  min_bloque_libre: number;
  suma_fin_ultima_clase: number;
  suma_inicio_primera_clase: number;
}

function minutosTraslape(sesion: Sesion, bloqueos: Sesion[]): number {
  let total = 0;
  for (const b of bloqueos) {
    const comunes = sesion.dias.filter((d) => b.dias.includes(d)).length;
    if (comunes) {
      const solapa = Math.max(0,
        Math.min(sesion.fin_min, b.fin_min) - Math.max(sesion.inicio_min, b.inicio_min));
      total += solapa * comunes;
    }
  }
  return total;
}

export function computeMetrics(combinacion: Combo, bloqueosEvitar: Sesion[] = []): Metrics {
  const porDia: Record<string, Array<[number, number]>> =
    Object.fromEntries(DIAS_LABORALES.map((d) => [d, []]));
  let usaSabado = false, usaDomingo = false, minutosEnEvitar = 0;

  for (const [, opcion] of combinacion) {
    for (const s of sesionesDe(opcion)) {
      minutosEnEvitar += minutosTraslape(s, bloqueosEvitar);
      for (const d of s.dias) {
        if (porDia[d]) porDia[d].push([s.inicio_min, s.fin_min]);
        else if (d === "SA") usaSabado = true;
        else if (d === "DO") usaDomingo = true;
      }
    }
  }

  const diasConClase = DIAS_LABORALES.filter((d) => porDia[d].length);
  const diasLibres = DIAS_LABORALES.filter((d) => !porDia[d].length);

  const bloqueLibreMasLargo = (dia: Dia): number => {
    const ocupado = [...porDia[dia]].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const libres: number[] = [];
    let cursor = DIA_INICIO_MIN;
    for (const [ini, fin] of ocupado) {
      const iniC = Math.max(ini, DIA_INICIO_MIN), finC = Math.min(fin, DIA_FIN_MIN);
      if (iniC > cursor) libres.push(iniC - cursor);
      cursor = Math.max(cursor, finC);
    }
    if (cursor < DIA_FIN_MIN) libres.push(DIA_FIN_MIN - cursor);
    return libres.length ? Math.max(...libres) : DIA_FIN_MIN - DIA_INICIO_MIN;
  };

  const bloques = Object.fromEntries(
    DIAS_LABORALES.map((d) => [d, bloqueLibreMasLargo(d)]));

  const finPorDia = DIAS_LABORALES.map((d) =>
    porDia[d].length ? Math.max(...porDia[d].map(([, f]) => f)) : 0);
  const inicioPorDia = DIAS_LABORALES.map((d) =>
    porDia[d].length ? Math.min(...porDia[d].map(([i]) => i)) : DIA_FIN_MIN);

  return {
    minutos_en_evitar: minutosEnEvitar,
    dias_con_clase: diasConClase,
    dias_libres: diasLibres,
    num_dias_con_clase: diasConClase.length,
    usa_sabado: usaSabado,
    usa_domingo: usaDomingo,
    bloques_libres_por_dia: bloques,
    suma_bloques_libres: Object.values(bloques).reduce((a, b) => a + b, 0),
    min_bloque_libre: Math.min(...Object.values(bloques)),
    suma_fin_ultima_clase: finPorDia.reduce((a, b) => a + b, 0),
    suma_inicio_primera_clase: inicioPorDia.reduce((a, b) => a + b, 0),
  };
}

/** Todas las llaves son "mayor es mejor"; el primer criterio SIEMPRE es
 * minimizar los minutos en zonas «mejor no». */
type Score = (m: Metrics) => number[];

export const ESTRATEGIAS: Record<string, { nombre: string; descripcion: string; score: Score }> = {
  manana_compacta: {
    nombre: "Salir temprano",
    descripcion: "Terminar clases lo antes posible cada día.",
    score: (m) => [-m.minutos_en_evitar, -m.suma_fin_ultima_clase],
  },
  empezar_tarde: {
    nombre: "Entrar tarde",
    descripcion: "Empezar clases lo más tarde posible.",
    score: (m) => [-m.minutos_en_evitar, m.suma_inicio_primera_clase],
  },
  maximo_dia_libre: {
    nombre: "Máximo día libre",
    descripcion: "Concentrar clases en pocos días.",
    score: (m) => [-m.minutos_en_evitar, -m.num_dias_con_clase, m.suma_bloques_libres],
  },
  bloques_mixtos: {
    nombre: "Bloques libres",
    descripcion: "Huecos libres grandes y parejos entre días.",
    score: (m) => [-m.minutos_en_evitar, m.suma_bloques_libres, m.min_bloque_libre],
  },
};

export type Evaluada = [Combo, Metrics];

export function evaluar(combinaciones: Combo[], bloqueosEvitar: Sesion[] = []): Evaluada[] {
  return combinaciones.map((c) => [c, computeMetrics(c, bloqueosEvitar)]);
}

/** Orden descendente estable por la tupla de score (== sorted(reverse=True)). */
export function rankear(evaluadas: Evaluada[], estrategiaId: string, topN = 3): Evaluada[] {
  const score = ESTRATEGIAS[estrategiaId].score;
  return [...evaluadas]
    .map((e, i) => ({ e, i, s: score(e[1]) }))
    .sort((a, b) => {
      for (let k = 0; k < Math.max(a.s.length, b.s.length); k++) {
        const d = (b.s[k] ?? 0) - (a.s[k] ?? 0);
        if (d) return d;
      }
      return a.i - b.i;   // estabilidad explícita
    })
    .slice(0, topN)
    .map(({ e }) => e);
}
