/** Tests del ejecutor de herramientas del asistente IA: la capa que valida
 * las acciones del modelo contra el catálogo real. El modelo en sí no se
 * testea acá (corre solo en navegador); sí TODO lo que decide qué se aplica. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { E } from "@/lib/cliente/estado";
import {
  ejecutarAcciones, etiquetaAccion, parsearRespuesta, type AccionIA,
} from "@/lib/cliente/ia/herramientas";
import { resumenEstado } from "@/lib/cliente/ia/prompt";
import type { Catalogo, CursoCatalogo } from "@/lib/cliente/estado";

/* acciones.ts persiste en localStorage; en node no existe → stub mínimo. */
vi.stubGlobal("localStorage", {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
});

const curso = (codigo: string, nombre: string): CursoCatalogo => ({
  codigo, nombre, num_secciones: 2, tiene_clase: true,
  componentes_practicos: [], secciones: [],
});

const CURSOS = [
  curso("0770", "ARQUITECTURA DE COMPUTADORES 1"),
  curso("0147", "FISICA 1"),
  curso("0148", "FISICA 2"),
  curso("0281", "ECONOMIA"),
];

beforeEach(() => {
  E.catalogo = { cursos: CURSOS, total_cursos: CURSOS.length } as unknown as Catalogo;
  E.porCodigo = new Map(CURSOS.map((c) => [c.codigo, c]));
  E.seleccion = ["0770"];
  E.manuales = new Set(["0770"]);
  E.excluidos = new Set();
  E.bloqueos = new Map();
  E.restringidas = {};
  E.resultado = null;
  E.miHorario = null;
  E.editor = null;
});

describe("parsearRespuesta", () => {
  it("acepta la forma canónica y filtra acciones desconocidas", () => {
    const r = parsearRespuesta(JSON.stringify({
      tipo: "acciones",
      mensaje: "ok",
      acciones: [
        { accion: "generar" },
        { accion: "hackear_pentagono" },
      ],
    }));
    expect(r?.tipo).toBe("acciones");
    expect(r?.acciones).toEqual([{ accion: "generar" }]);
  });

  it("descarta acciones si el tipo no es «acciones»", () => {
    const r = parsearRespuesta(JSON.stringify({
      tipo: "respuesta", mensaje: "hola", acciones: [{ accion: "limpiar_bloqueos" }],
    }));
    expect(r?.acciones).toEqual([]);
  });

  it("devuelve null ante basura", () => {
    expect(parsearRespuesta("no soy json")).toBeNull();
    expect(parsearRespuesta(JSON.stringify({ tipo: "otra_cosa", mensaje: "x" }))).toBeNull();
  });
});

describe("bloquear", () => {
  it("pinta el rango ajustado a la rejilla de 30 min", async () => {
    const r = await ejecutarAcciones([{
      accion: "bloquear", nivel: "imposible",
      dias: ["LU", "MA"], desde: "07:10", hasta: "11:50",
    }]);
    expect(r.errores).toEqual([]);
    // 07:10→07:00 (floor) y 11:50→12:00 (ceil): 10 celdas de 30 min por día.
    expect(E.bloqueos.size).toBe(20);
    expect(E.bloqueos.get("LU|420")).toBe("imposible");
    expect(E.bloqueos.get("MA|690")).toBe("imposible");
    expect(E.bloqueos.get("LU|720")).toBeUndefined();
    expect(r.hechos[0]).toContain("07:00–12:00");
    expect(r.hechos[0]).toContain("No puedo");
  });

  it("acepta nombres de días completos y rechaza inventados", async () => {
    const ok = await ejecutarAcciones([{
      accion: "bloquear", nivel: "evitar", dias: ["sábado"], desde: "07:00", hasta: "09:00",
    } as AccionIA]);
    expect(ok.hechos[0]).toContain("SA");
    const mal = await ejecutarAcciones([{
      accion: "bloquear", nivel: "evitar", dias: ["XX"], desde: "07:00", hasta: "09:00",
    }]);
    expect(mal.errores[0]).toContain("No reconocí los días");
  });

  it("rechaza rangos al revés", async () => {
    const r = await ejecutarAcciones([{
      accion: "bloquear", nivel: "imposible", dias: ["LU"], desde: "15:00", hasta: "08:00",
    }]);
    expect(r.errores).toHaveLength(1);
    expect(E.bloqueos.size).toBe(0);
  });

  it("borrar_bloqueo despinta solo el rango pedido", async () => {
    await ejecutarAcciones([{
      accion: "bloquear", nivel: "evitar", dias: ["VI"], desde: "07:00", hasta: "12:00",
    }]);
    const r = await ejecutarAcciones([{
      accion: "borrar_bloqueo", dias: ["VI"], desde: "07:00", hasta: "09:00",
    }]);
    expect(r.errores).toEqual([]);
    expect(E.bloqueos.get("VI|420")).toBeUndefined();
    expect(E.bloqueos.get("VI|540")).toBe("evitar");
  });
});

describe("cursos", () => {
  it("agrega por código exacto y por nombre parcial único", async () => {
    const r1 = await ejecutarAcciones([{ accion: "agregar_curso", curso: "0281" }]);
    expect(r1.hechos[0]).toContain("Economia");   // el catálogo USAC viene sin tildes
    const r2 = await ejecutarAcciones([{ accion: "agregar_curso", curso: "arquitectura" }]);
    expect(r2.hechos[0]).toContain("ya estaba");
    expect(E.seleccion).toEqual(["0770", "0281"]);
  });

  it("pide desambiguar cuando el nombre matchea varios", async () => {
    const r = await ejecutarAcciones([{ accion: "agregar_curso", curso: "física" }]);
    expect(r.errores[0]).toContain("varios cursos");
    expect(r.errores[0]).toContain("0147");
  });

  it("no inventa cursos que no están en el catálogo", async () => {
    const r = await ejecutarAcciones([{ accion: "agregar_curso", curso: "pizza" }]);
    expect(r.errores[0]).toContain("No encontré");
    expect(E.seleccion).toEqual(["0770"]);
  });

  it("quitar_curso queda pendiente de confirmación y arrastra la cola", async () => {
    const r = await ejecutarAcciones([
      { accion: "quitar_curso", curso: "0770" },
      { accion: "generar" },
    ]);
    expect(E.seleccion).toEqual(["0770"]);   // nada se ejecutó aún
    expect(r.pendientes).toHaveLength(2);
    const conf = await ejecutarAcciones(r.pendientes!, true);
    expect(E.seleccion).toEqual([]);
    expect(conf.hechos[0]).toContain("Quité 0770");
    expect(conf.errores[0]).toContain("No hay cursos");   // generar sin selección
  });

  it("quitar un curso que no está en la selección avisa sin romper", async () => {
    const r = await ejecutarAcciones([{ accion: "quitar_curso", curso: "0281" }], true);
    expect(r.errores[0]).toContain("no está entre tus cursos");
  });
});

describe("vista de resultados", () => {
  it("opción y estrategia validan contra el resultado real", async () => {
    const sinResultado = await ejecutarAcciones([{ accion: "opcion", n: 2 }]);
    expect(sinResultado.errores[0]).toContain("no hay horarios");
    const malaEstrategia = await ejecutarAcciones([{ accion: "estrategia", id: "vivir_de_noche" }]);
    expect(malaEstrategia.errores[0]).toContain("No existe la estrategia");
  });
});

describe("mover cursos y alternativas", () => {
  const comp = (dias: string[], inicio: string, fin: string, seccion: string) => ({
    categoria: "Clase", seccion, catedratico: "X", auxiliar: null,
    restringida: false, inicio, fin, dias, equivalentes: [],
  });
  const opA = { etiqueta: "Clase A", componentes: [comp(["LU", "MI"], "07:00", "08:40", "A")] };
  const opB = { etiqueta: "Clase B", componentes: [comp(["MA", "JU"], "09:00", "10:40", "B")] };
  const opC = { etiqueta: "Clase C", componentes: [comp(["LU", "MI"], "09:00", "10:40", "C")] };

  beforeEach(() => {
    E.seleccion = ["0770", "0147"];
    E.resultado = {
      total_validas: 2, cursos_incluidos: ["0770", "0147"],
      excluidos_por_bloqueos: [], sacrificios: [], hay_bloqueos: false,
      minutos_evitar_totales: 0, advertencias: [],
      opciones: { "0770": [opA, opB], "0147": [opC] },
      estrategias: [{
        id: "manana_compacta", nombre: "Salir temprano", descripcion: "",
        combos: [{
          metrics: {} as never,
          emergencia: {},
          cursos: [
            { codigo: "0770", nombre: "ARQUITECTURA DE COMPUTADORES 1", opcion_id: 0, ...opA },
            { codigo: "0147", nombre: "FISICA 1", opcion_id: 0, ...opC },
          ],
        }],
      }],
    };
    E.estrategia = "manana_compacta";
    E.opcion = 0;
  });

  it("alternativas lista solo secciones que caben, numeradas", async () => {
    const r = await ejecutarAcciones([{ accion: "alternativas", curso: "0770" }]);
    expect(r.errores).toEqual([]);
    expect(r.hechos[0]).toContain("1) Clase B");
    expect(r.hechos[0]).toContain("MA·JU 09:00–10:40");
  });

  it("un curso sin alternativas lo dice sin inventar", async () => {
    const r = await ejecutarAcciones([{ accion: "alternativas", curso: "física" }]);
    // "física" matchea 0147 (único en la selección aunque el catálogo tenga dos)
    expect(r.hechos[0]).toContain("no tiene otra sección");
  });

  it("mover_curso con una sola alternativa la aplica y guarda «Mi horario»", async () => {
    const r = await ejecutarAcciones([{ accion: "mover_curso", curso: "0770" }]);
    expect(r.errores).toEqual([]);
    expect(r.hechos[0]).toContain("Clase B");
    expect(E.opcion).toBe("mia");
    expect(E.miHorario?.ids["0770"]).toBe(1);
    expect(E.miHorario?.ids["0147"]).toBe(0);
  });

  it("mover_curso valida el número de alternativa", async () => {
    const r = await ejecutarAcciones([{ accion: "mover_curso", curso: "0770", alternativa: 5 }]);
    expect(r.errores[0]).toContain("Solo hay 1 alternativas");
    expect(E.miHorario).toBeNull();
  });

  it("compartir abre el modal; sin horario generado da error", async () => {
    const ok = await ejecutarAcciones([{ accion: "compartir" }]);
    expect(ok.hechos[0]).toContain("compartir");
    expect(E.modalCompartir).toBe(true);
    E.modalCompartir = false;
    E.resultado = null;
    const sin = await ejecutarAcciones([{ accion: "compartir" }]);
    expect(sin.errores[0]).toContain("generá un horario");
  });

  it("exportar sin horario generado avisa en vez de romper", async () => {
    E.resultado = null;
    const r = await ejecutarAcciones([{ accion: "exportar", formato: "excel" }]);
    expect(r.errores[0]).toContain("generá");
  });
});

describe("resumenEstado", () => {
  it("refleja cursos, bloqueos y falta de resultado", async () => {
    await ejecutarAcciones([{
      accion: "bloquear", nivel: "imposible", dias: ["LU"], desde: "08:00", hasta: "17:00",
    }]);
    const s = resumenEstado();
    expect(s).toContain("0770 Arquitectura De Computadores 1");
    expect(s).toContain("NO PUEDE en LU 08:00–17:00");
    expect(s).toContain("todavía no se han generado");
  });
});
