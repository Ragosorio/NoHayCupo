/** Parser de la red de estudios (pénsum) — puerto de scraper/pensum.py. */
import { parse as parseHTML } from "node-html-parser";

export interface CursoPensum {
  codigo: string;
  nombre: string;
  creditos: number | null;
  semestre: number | null;
  area: number | null;
  prerrequisitos: string[];
}

const ORDINALES: Record<string, number> = {
  PRIMER: 1, SEGUNDO: 2, TERCER: 3, CUARTO: 4, QUINTO: 5,
  SEXTO: 6, "SÉPTIMO": 7, OCTAVO: 8, NOVENO: 9, "DÉCIMO": 10,
  SEPTIMO: 7, DECIMO: 10,
};

const texto = (el: { structuredText: string }) =>
  el.structuredText.split(/\s+/).join(" ").trim();

export function parsePensum(html: string): CursoPensum[] {
  const raiz = parseHTML(html);
  const cursos: CursoPensum[] = [];
  let semestre: number | null = null;

  // El orden del documento importa: los encabezados de semestre preceden a
  // sus filas. Recorremos ambos tipos de nodo en orden de aparición.
  for (const el of raiz.querySelectorAll(".header-red-title, .body-red-curricular")) {
    if (el.classList.contains("header-red-title")) {
      for (const small of el.querySelectorAll("small")) {
        const t = texto(small).toUpperCase();
        if (t in ORDINALES) semestre = ORDINALES[t];
      }
      continue;
    }
    const codigoEl = el.querySelector(".body-red-codigo-division small");
    if (!codigoEl) continue;
    const codigo = texto(codigoEl);
    if (!/^\d+$/.test(codigo)) continue;

    const credEl = el.querySelector("small[creditos]");
    const nombre = el.querySelectorAll(".body-red-descripcion small")
      .map(texto).join(" ").trim();
    const areaAttr = el.querySelector(".body-red-area")?.getAttribute("area");
    const prerrequisitos = el.querySelectorAll(".body-red-prerrequisito-item")
      .map(texto).filter((t) => /^\d+$/.test(t));

    cursos.push({
      codigo,
      nombre,
      creditos: credEl ? Number(credEl.getAttribute("creditos")) : null,
      semestre,
      area: areaAttr && /^\d+$/.test(areaAttr) ? Number(areaAttr) : null,
      prerrequisitos,
    });
  }
  return cursos;
}
