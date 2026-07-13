/** Tests del relabel de sección mostrada (secciones equivalentes): override
 * puramente visual, sin tocar el motor. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { E, type ComponenteJson } from "@/lib/cliente/estado";
import {
  cambiarEtiquetaSeccion, seccionesEquivalentes, seccionMostrada,
} from "@/lib/cliente/acciones";

vi.stubGlobal("localStorage", {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
});

const comp = (seccion: string, equivalentes: string[] = []): ComponenteJson => ({
  categoria: "Clase", seccion, catedratico: "X", auxiliar: null,
  restringida: false, inicio: "07:00", fin: "08:40", dias: ["LU", "MI"],
  equivalentes: equivalentes.map((s) => ({ seccion: s, catedratico: "Y" })),
});

beforeEach(() => { E.etiquetas = {}; });

describe("seccionesEquivalentes", () => {
  it("sin equivalentes devuelve vacío", () => {
    expect(seccionesEquivalentes(comp("B"))).toEqual([]);
  });
  it("junta la mostrada con las equivalentes, ordenadas y sin repetir", () => {
    expect(seccionesEquivalentes(comp("B", ["A", "B"]))).toEqual(["A", "B"]);
  });
});

describe("seccionMostrada / cambiarEtiquetaSeccion", () => {
  it("por defecto muestra la sección original", () => {
    expect(seccionMostrada("0768", comp("B", ["A"]))).toBe("B");
  });

  it("aplica el override elegido y persiste hasta volver al default", () => {
    cambiarEtiquetaSeccion("0768", "Clase", "A", "B");
    expect(seccionMostrada("0768", comp("B", ["A"]))).toBe("A");
    // Volver a la original limpia el override (no deja basura).
    cambiarEtiquetaSeccion("0768", "Clase", "B", "B");
    expect(E.etiquetas["0768|Clase"]).toBeUndefined();
    expect(seccionMostrada("0768", comp("B", ["A"]))).toBe("B");
  });

  it("ignora un override que ya no es equivalente válido (combo cambió)", () => {
    E.etiquetas["0768|Clase"] = "Z";   // Z ya no existe entre las equivalentes
    expect(seccionMostrada("0768", comp("B", ["A"]))).toBe("B");
  });

  it("el override es por curso+categoría (no pisa el laboratorio)", () => {
    cambiarEtiquetaSeccion("0768", "Clase", "A", "B");
    const lab: ComponenteJson = { ...comp("D", ["C"]), categoria: "Laboratorio" };
    expect(seccionMostrada("0768", lab)).toBe("D");
  });
});
