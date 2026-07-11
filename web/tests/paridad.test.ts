/** Tests de paridad: el motor TS debe reproducir EXACTAMENTE las salidas
 * canónicas exportadas del motor Python (scripts/exportar_paridad.py).
 * Si algo difiere acá, el port está mal — no se avanza hasta el 100%. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { etiquetaDe, hhmmToMin, minToHHMM, sesionesDe, type Sesion } from "@/lib/engine/models";
import { buildOpcionesCurso } from "@/lib/engine/opciones";
import { findAllValidCombinations, variantesEmergencia, type Requisito } from "@/lib/engine/solver";
import { computeMetrics, ESTRATEGIAS, evaluar, rankear } from "@/lib/engine/strategies";
import { agruparCursos, parseSecciones } from "@/lib/scraper/catalogo";
import { parsePensum } from "@/lib/scraper/pensum";

const leer = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf-8");
const json = (n: string) => JSON.parse(leer(n));

const html = leer("muestra.html");
const canonCatalogo = json("paridad_catalogo.json");
const canonPensum = json("paridad_pensum.json");
const canonEngine = json("paridad_engine.json");

const secciones = parseSecciones(html);
const cursos = agruparCursos(secciones);

describe("paridad: parser de catálogo", () => {
  it("produce las mismas secciones que Python, en el mismo orden", () => {
    const nuestras = secciones.map((s) => ({
      curso_codigo: s.curso_codigo,
      curso_nombre: s.curso_nombre,
      seccion: s.seccion,
      categoria: s.categoria,
      modalidad: s.modalidad,
      inicio: s.inicio_min !== null ? minToHHMM(s.inicio_min) : null,
      fin: s.fin_min !== null ? minToHHMM(s.fin_min) : null,
      dias: s.dias,
      catedratico: s.catedratico,
      auxiliar: s.auxiliar,
      restringida: s.restringida,
    }));
    expect(nuestras).toEqual(canonCatalogo);
  });
});

describe("paridad: parser de pénsum", () => {
  it("produce los mismos cursos que Python", () => {
    expect(parsePensum(leer("pensum_muestra.html"))).toEqual(canonPensum);
  });
});

function opcionesDe(codigo: string, incluir: string[] = []) {
  return buildOpcionesCurso(cursos.get(codigo)!, new Set(incluir));
}

describe("paridad: opciones por curso", () => {
  for (const [codigo, esperado] of Object.entries<any>(canonEngine.opciones_por_curso)) {
    it(`${codigo} (restringidas: ${JSON.stringify(esperado.incluir_restringidas)})`, () => {
      const { opciones, advertencias } = opcionesDe(codigo, esperado.incluir_restringidas);
      expect(advertencias).toEqual(esperado.advertencias);
      expect(opciones.map((op) => ({
        etiqueta: etiquetaDe(op),
        sesiones: sesionesDe(op).map((s) => ({
          inicio: minToHHMM(s.inicio_min), fin: minToHHMM(s.fin_min), dias: s.dias,
        })),
        componentes: op.componentes.map((c) => ({
          categoria: c.categoria,
          seccion: c.secciones[0].seccion,
          catedratico: c.secciones[0].catedratico,
          equivalentes: c.secciones.slice(1).map((s) => ({
            seccion: s.seccion, catedratico: s.catedratico,
          })),
        })),
      }))).toEqual(esperado.opciones);
    });
  }
});

function requisitosCanon(): { requisitos: Requisito[]; indices: Map<string, Map<unknown, number>> } {
  const requisitos: Requisito[] = [];
  const indices = new Map<string, Map<unknown, number>>();
  for (const codigo of canonEngine.solver.cursos) {
    const incluir = codigo === "0550" ? ["1+", "N+"] : [];
    const { opciones } = opcionesDe(codigo, incluir);
    requisitos.push([codigo, opciones]);
    indices.set(codigo, new Map(opciones.map((op, i) => [op, i])));
  }
  return { requisitos, indices };
}

describe("paridad: solver + métricas + ranking", () => {
  const { requisitos, indices } = requisitosCanon();
  const combos = findAllValidCombinations(requisitos);

  it("mismas combinaciones, en el mismo orden", () => {
    expect(combos.length).toBe(canonEngine.solver.total_combos);
    const comoIndices = combos.map((combo) =>
      combo.map(([cod, op]) => indices.get(cod)!.get(op)));
    expect(comoIndices).toEqual(canonEngine.solver.combos);
  });

  const evitar: Sesion[] = (["LU", "MA", "MI", "JU", "VI"] as const).map((d) => ({
    inicio_min: hhmmToMin("07:00"), fin_min: hhmmToMin("17:00"), dias: [d],
  }));

  it("mismas métricas (primeros 10 combos, con bloqueos evitar LU-VI 7-17)", () => {
    const nuestras = combos.slice(0, 10).map((c) => {
      const m = computeMetrics(c, evitar);
      return {
        minutos_en_evitar: m.minutos_en_evitar,
        dias_libres: m.dias_libres,
        num_dias_con_clase: m.num_dias_con_clase,
        usa_sabado: m.usa_sabado,
        min_bloque_libre: m.min_bloque_libre,
        suma_fin_ultima_clase: m.suma_fin_ultima_clase,
        suma_inicio_primera_clase: m.suma_inicio_primera_clase,
      };
    });
    expect(nuestras).toEqual(canonEngine.metricas_primeros_10);
  });

  it("mismo top-3 por estrategia", () => {
    const evaluadas = evaluar(combos, evitar);
    const pos = new Map(evaluadas.map(([c], i) => [c, i]));
    const rankings = Object.fromEntries(Object.keys(ESTRATEGIAS).map((eid) => [
      eid, rankear(evaluadas, eid, 3).map(([c]) => pos.get(c)),
    ]));
    expect(rankings).toEqual(canonEngine.rankings_top3);
  });

  it("mismas variantes de emergencia del primer combo", () => {
    const em = variantesEmergencia(combos[0], requisitos);
    const comoIdx = Object.fromEntries([...em].map(([cod, ops]) =>
      [cod, ops.map((op) => indices.get(cod)!.get(op))]));
    expect(comoIdx).toEqual(canonEngine.emergencia_combo_0);
  });
});
