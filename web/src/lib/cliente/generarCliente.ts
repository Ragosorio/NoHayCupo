/** Generación de horarios EN EL NAVEGADOR — puerto de generar() de ui/app.py.
 *
 * Decisión central de la migración: el solver corre en el cliente, así el
 * servidor solo sirve JSON cacheables y el costo por usuario es cero. La
 * salida tiene EXACTAMENTE la misma forma que producía el endpoint Python,
 * para que la UI portada no cambie ni una línea de lógica.
 */
import {
  etiquetaDe, hhmmToMin, minToHHMM, sesionesDe,
  type Curso, type Dia, type Opcion, type Seccion, type Sesion,
} from "../engine/models";
import { buildOpcionesCurso } from "../engine/opciones";
import { sesionesSeTraslapan } from "../engine/overlap";
import {
  findAllValidCombinations, variantesEmergencia, type Combo, type Requisito,
} from "../engine/solver";
import { computeMetrics, ESTRATEGIAS, evaluar, rankear, type Metrics } from "../engine/strategies";
import type { Catalogo, CursoCatalogo, OpcionJson, Resultado } from "./estado";

/** Reconstruye el Curso del motor desde el JSON del catálogo. */
function cursoDesdeJson(c: CursoCatalogo): Curso {
  const curso: Curso = {
    codigo: c.codigo, nombre: c.nombre,
    secciones_clase: [], componentes_practicos: new Map(),
  };
  for (const s of c.secciones) {
    const sec: Seccion = {
      curso_codigo: c.codigo, curso_nombre: c.nombre,
      seccion: s.seccion, categoria: s.categoria, modalidad: s.modalidad,
      inicio_min: s.inicio !== null ? hhmmToMin(s.inicio) : null,
      fin_min: s.fin !== null ? hhmmToMin(s.fin) : null,
      dias: s.dias as Dia[],
      catedratico: s.catedratico, auxiliar: s.auxiliar, restringida: s.restringida,
    };
    if (sec.categoria === null) curso.secciones_clase.push(sec);
    else {
      const lista = curso.componentes_practicos.get(sec.categoria);
      if (lista) lista.push(sec);
      else curso.componentes_practicos.set(sec.categoria, [sec]);
    }
  }
  return curso;
}

export interface BloqueoRango { dia: string; inicio: string; fin: string; nivel: string }

function parseBloqueos(crudos: BloqueoRango[]): { imposibles: Sesion[]; evitar: Sesion[] } {
  const imposibles: Sesion[] = [], evitar: Sesion[] = [];
  for (const b of crudos) {
    const sesion: Sesion = {
      inicio_min: hhmmToMin(b.inicio), fin_min: hhmmToMin(b.fin), dias: [b.dia as Dia],
    };
    (b.nivel === "imposible" ? imposibles : evitar).push(sesion);
  }
  return { imposibles, evitar };
}

function opcionJson(op: Opcion): OpcionJson {
  return {
    etiqueta: etiquetaDe(op),
    componentes: op.componentes.map((c) => {
      const p = c.secciones[0];
      return {
        categoria: c.categoria,
        seccion: p.seccion,
        catedratico: p.catedratico,
        auxiliar: p.auxiliar,
        restringida: p.restringida,
        inicio: minToHHMM(c.sesion.inicio_min),
        fin: minToHHMM(c.sesion.fin_min),
        dias: c.sesion.dias,
        equivalentes: c.secciones.slice(1).map((s) => ({
          seccion: s.seccion, catedratico: s.catedratico,
        })),
      };
    }),
  };
}

function metricsJson(m: Metrics, minutosEvitarTotales: number) {
  return {
    minutos_en_evitar: m.minutos_en_evitar,
    horas_en_evitar: Math.round(m.minutos_en_evitar / 60 * 10) / 10,
    minutos_evitar_totales: minutosEvitarTotales,
    dias_libres: m.dias_libres,
    num_dias_con_clase: m.num_dias_con_clase,
    usa_sabado: m.usa_sabado,
    min_bloque_libre_h: Math.round(m.min_bloque_libre / 60 * 10) / 10,
  };
}

export function generarResultado(opts: {
  catalogo: Catalogo;
  codigos: string[];
  restringidas: Record<string, Set<string>>;
  bloqueos: BloqueoRango[];
  topN: number;
}): Resultado {
  const { catalogo, codigos, restringidas, bloqueos } = opts;
  const topN = Math.max(1, Math.min(opts.topN, 25));
  const { imposibles, evitar } = parseBloqueos(bloqueos);
  const porCodigo = new Map(catalogo.cursos.map((c) => [c.codigo, c]));

  const advertencias: string[] = [];
  const requisitos: Requisito[] = [];
  const nombres: Record<string, string> = {};
  const chocanConBloqueos: string[] = [];

  for (const codigo of codigos) {
    const cursoJson = porCodigo.get(codigo);
    if (!cursoJson) {
      advertencias.push(`El curso ${codigo} no existe en el catálogo del semestre ${catalogo.semestre}.`);
      continue;
    }
    nombres[codigo] = cursoJson.nombre;
    const curso = cursoDesdeJson(cursoJson);
    const permitidas = restringidas[codigo] ?? new Set<string>();
    const { opciones, advertencias: warns } = buildOpcionesCurso(curso, permitidas);
    advertencias.push(...warns);
    if (!opciones.length) {
      advertencias.push(
        `${codigo} ${curso.nombre} quedó SIN opciones inscribibles y se excluyó ` +
        `de la búsqueda de combinaciones.`);
      continue;
    }
    const compatibles = opciones.filter(
      (op) => !sesionesSeTraslapan(sesionesDe(op), imposibles));
    if (!compatibles.length) {
      chocanConBloqueos.push(codigo);
      advertencias.push(
        `${codigo} ${curso.nombre}: TODAS sus secciones caen dentro de tus ` +
        `bloqueos «imposible». Para llevarlo tendrías que liberar tiempo; ` +
        `se excluyó de la búsqueda.`);
      continue;
    }
    requisitos.push([codigo, compatibles]);
  }

  const combos: Combo[] = requisitos.length
    ? findAllValidCombinations(requisitos, imposibles) : [];

  const sacrificios: Resultado["sacrificios"] = [];
  if (requisitos.length && !combos.length) {
    advertencias.push(
      "Con esos cursos y tus bloqueos no existe NINGUNA combinación sin " +
      "traslapes. Opciones: liberar bloqueos, habilitar secciones " +
      "restringidas, o sacrificar un curso (sugerencias abajo).");
    if (requisitos.length > 1) {
      requisitos.forEach(([codigo], i) => {
        const resto = [...requisitos.slice(0, i), ...requisitos.slice(i + 1)];
        const n = findAllValidCombinations(resto, imposibles, 5000).length;
        if (n) sacrificios.push({ codigo, nombre: nombres[codigo], combinaciones: n });
      });
      sacrificios.sort((a, b) => b.combinaciones - a.combinaciones);
    }
  }

  const minutosEvitarTotales = evitar.reduce(
    (t, b) => t + (b.fin_min - b.inicio_min) * b.dias.length, 0);
  const evaluadas = evaluar(combos, evitar);
  const idsPorCurso = new Map(requisitos.map(([codigo, ops]) =>
    [codigo, new Map(ops.map((op, i) => [op, i]))]));

  const comboJson = (combo: Combo, m: Metrics) => ({
    metrics: metricsJson(m, minutosEvitarTotales),
    cursos: combo.map(([codigo, opcion]) => ({
      codigo,
      nombre: nombres[codigo],
      opcion_id: idsPorCurso.get(codigo)!.get(opcion)!,
      ...opcionJson(opcion),
    })),
    emergencia: Object.fromEntries(
      [...variantesEmergencia(combo, requisitos, imposibles)].map(([codigo, ops]) =>
        [codigo, ops.slice(0, 3).map(opcionJson)])),
  });

  return {
    total_validas: combos.length,
    cursos_incluidos: requisitos.map(([codigo]) => codigo),
    excluidos_por_bloqueos: chocanConBloqueos,
    sacrificios,
    hay_bloqueos: imposibles.length > 0 || evitar.length > 0,
    minutos_evitar_totales: minutosEvitarTotales,
    advertencias,
    opciones: Object.fromEntries(requisitos.map(([codigo, ops]) =>
      [codigo, ops.map(opcionJson)])),
    estrategias: Object.entries(ESTRATEGIAS).map(([id, meta]) => ({
      id,
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      combos: rankear(evaluadas, id, topN).map(([c, m]) => comboJson(c, m)),
    })),
  };
}

/** Métricas del combo editado a mano (mismas fórmulas del motor). */
export function metricasDeOpciones(
  opciones: OpcionJson[], bloqueos: BloqueoRango[],
): ReturnType<typeof metricsJson> {
  const { evitar } = parseBloqueos(bloqueos);
  const combo: Combo = opciones.map((op, i) => [String(i), {
    componentes: op.componentes.map((c) => ({
      categoria: c.categoria,
      sesion: {
        inicio_min: hhmmToMin(c.inicio), fin_min: hhmmToMin(c.fin),
        dias: c.dias as Dia[],
      },
      secciones: [],
    })),
  }]);
  const total = evitar.reduce((t, b) => t + (b.fin_min - b.inicio_min) * b.dias.length, 0);
  return metricsJson(computeMetrics(combo, evitar), total);
}
