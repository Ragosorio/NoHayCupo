/** Tests del validador del importador de grupos (scripts/grupos/validar.mjs).
 * JS puro: prueba la lógica que decide qué entra al JSON de la comunidad. */
import { describe, expect, it } from "vitest";
import {
  clasificarLink, fraccionAHHMM, validarArchivo, validarFila, indexarCatalogo,
} from "../../scripts/grupos/validar.mjs";

const CATALOGO = {
  cursos: [{
    codigo: "0768",
    nombre: "INTRODUCCION A LOS ALGORITMOS Y FLUJO DE DATOS",
    secciones: [{
      seccion: "A", categoria: "Clase", inicio: "07:10", fin: "08:50",
      dias: ["MA", "JU"], catedratico: "JUAN PEREZ", restringida: false,
    }],
  }],
};

// Simula una fila de lib-xlsx (celdas por columna + links por columna).
const fila = (over = {}) => ({
  n: 10,
  celdas: {
    A: "0768 INTRODUCCION A LOS ALGORITMOS Y FLUJO DE DATOS", B: "A",
    D: "0.2986111111", E: "0.3680555556", F: "MA JU", G: "JUAN PEREZ",
    ...over.celdas,
  },
  links: { J: "https://chat.whatsapp.com/Bz9ecHEQYUyDR2JJOjXnas?s=cl&p=a", ...over.links },
});

describe("fraccionAHHMM", () => {
  it("convierte fracciones de día a HH:MM", () => {
    expect(fraccionAHHMM(0.4444444444)).toBe("10:40");
    expect(fraccionAHHMM("0.2986111111")).toBe("07:10");
  });
});

describe("clasificarLink", () => {
  it("acepta WhatsApp y Telegram y limpia el tracking", () => {
    expect(clasificarLink("https://chat.whatsapp.com/Bz9ecHEQYUyDR2JJOjXnas?s=cl&p=a"))
      .toEqual({ tipo: "whatsapp", url: "https://chat.whatsapp.com/Bz9ecHEQYUyDR2JJOjXnas" });
    expect(clasificarLink("https://t.me/+AbCdEfGh12")).toMatchObject({ tipo: "telegram" });
    expect(clasificarLink("https://t.me/joinchat/AbCdEfGh12")).toMatchObject({ tipo: "telegram" });
  });
  it("rechaza cualquier otro dominio", () => {
    expect(clasificarLink("https://tiktok.com/@x")).toBeNull();
    expect(clasificarLink("https://instagram.com/x")).toBeNull();
    expect(clasificarLink("https://wa.me/50212345678")).toBeNull();
  });
});

describe("validarFila", () => {
  const idx = indexarCatalogo(CATALOGO);
  it("acepta una fila que calza con el catálogo", () => {
    const r = validarFila(fila(), idx);
    expect(r).toEqual({ codigo: "0768", seccion: "A", whatsapp: "https://chat.whatsapp.com/Bz9ecHEQYUyDR2JJOjXnas" });
  });
  it("rechaza si el nombre no coincide", () => {
    expect(validarFila(fila({ celdas: { A: "0768 OTRO NOMBRE" } }), idx).error).toMatch(/no coincide/);
  });
  it("rechaza si el horario no coincide", () => {
    expect(validarFila(fila({ celdas: { D: "0.5" } }), idx).error).toMatch(/no coincide con el catálogo/);
  });
  it("rechaza un curso inexistente", () => {
    expect(validarFila(fila({ celdas: { A: "9999 FANTASMA" } }), idx).error).toMatch(/no existe/);
  });
  it("rechaza un link de otro dominio", () => {
    expect(validarFila(fila({ links: { J: "https://tiktok.com/@x" } }), idx).error).toMatch(/no permitido/);
  });
});

describe("validarArchivo", () => {
  it("junta solo las filas con grupo válido y ordena", () => {
    const filas = [
      { n: 3, celdas: { A: "Nombre de Curso", J: "GRUPOS WHATSAPP" }, links: {} }, // header: se ignora
      { n: 4, celdas: fila().celdas, links: fila().links },
      { n: 5, celdas: { A: "0250 MECANICA DE FLUIDOS", B: "1" }, links: {} },        // sin link
    ];
    const { grupos, aceptadas, errores } = validarArchivo(filas, CATALOGO);
    expect(errores).toEqual([]);
    expect(aceptadas).toBe(1);
    expect(grupos["0768"]["A"].whatsapp).toContain("chat.whatsapp.com");
  });
});
