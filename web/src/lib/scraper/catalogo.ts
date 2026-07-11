/** Parser de la tabla HTML de horarios -> Seccion[] — puerto de scraper/parse.py.
 *
 * Las columnas se resuelven por NOMBRE del <th>, nunca por posición: el
 * layout de semestre trae "Modalidad" y el de vacaciones "Edificio|Salón".
 * Solo lo usan los endpoints del servidor (nunca el navegador).
 */
import { parse as parseHTML, type HTMLElement } from "node-html-parser";
import {
  DIAS_SEMANA, hhmmToMin, ordenarDias, todasLasSecciones,
  type Curso, type Dia, type Seccion,
} from "../engine/models";

export const BADGE_CATEGORIA: Record<string, string> = {
  "badge-blue": "Laboratorio",
  "badge-danger": "Práctica",
  "badge-info": "Trabajo Dirigido",
  "badge-success": "Dibujo",
};

const norm = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).join(" ").trim();

const texto = (el: HTMLElement) => el.structuredText.split(/\s+/).join(" ").trim();

function horaONull(t: string): number | null {
  try { return hhmmToMin(t.trim()); } catch { return null; }
}

export function parseSecciones(html: string): Seccion[] {
  const raiz = parseHTML(html);
  const tabla = raiz.querySelector("#tblHorarios");
  if (!tabla) return [];

  const encabezados = tabla.querySelectorAll("th").map((th) => norm(texto(th)));
  const idx = new Map(encabezados.map((t, i) => [t, i]));
  const col = {
    nombre: idx.get("nombre de curso") ?? 0,
    seccion: idx.get("seccion") ?? 1,
    modalidad: idx.get("modalidad") ?? null,
    edificio: idx.get("edificio") ?? null,
    salon: idx.get("salon") ?? null,
    inicio: idx.get("inicio") ?? 3,
    fin: idx.get("final") ?? 4,
    dias: idx.get("dias") ?? 5,
    catedratico: idx.get("catedratico") ?? 6,
    auxiliar: idx.get("auxiliar") ?? 7,
    detalle: idx.get("detalle") ?? 8,
  };
  const minimo = Math.max(col.detalle, col.dias, col.auxiliar) + 1;

  const secciones: Seccion[] = [];
  for (const tr of tabla.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < minimo) continue;
    const celda = (i: number | null) => (i !== null && i < tds.length ? texto(tds[i]) : "");

    const partes = celda(col.nombre).split(/\s+/);
    if (!partes.length || !/^\d+$/.test(partes[0])) continue;
    const codigo = partes[0];
    const nombre = partes.slice(1).join(" ");

    let badge: string | null = null;
    const span = tds[col.nombre].querySelector("span.badge");
    if (span) {
      for (const clase of Object.keys(BADGE_CATEGORIA)) {
        if (span.classList.contains(clase)) badge = clase;
      }
    }

    let auxiliar: string | null = celda(col.auxiliar) || null;
    if (auxiliar && auxiliar.toUpperCase() === "SIN AUXILIAR") auxiliar = null;

    let modalidad = celda(col.modalidad);
    if (!modalidad) {
      modalidad = [celda(col.edificio), celda(col.salon)].filter(Boolean).join(" · ");
    }

    secciones.push({
      curso_codigo: codigo,
      curso_nombre: nombre,
      seccion: celda(col.seccion),
      categoria: badge ? BADGE_CATEGORIA[badge] : null,
      modalidad,
      inicio_min: horaONull(celda(col.inicio)),
      fin_min: horaONull(celda(col.fin)),
      dias: ordenarDias(celda(col.dias).split(/\s+/)
        .filter((d): d is Dia => (DIAS_SEMANA as readonly string[]).includes(d))),
      catedratico: celda(col.catedratico),
      auxiliar,
      restringida: celda(col.detalle).includes("Ver Restricciones"),
    });
  }
  return secciones;
}

export function agruparCursos(secciones: Seccion[]): Map<string, Curso> {
  const cursos = new Map<string, Curso>();
  for (const sec of secciones) {
    let curso = cursos.get(sec.curso_codigo);
    if (!curso) {
      curso = {
        codigo: sec.curso_codigo, nombre: sec.curso_nombre,
        secciones_clase: [], componentes_practicos: new Map(),
      };
      cursos.set(sec.curso_codigo, curso);
    }
    if (sec.categoria === null) {
      curso.secciones_clase.push(sec);
    } else {
      const lista = curso.componentes_practicos.get(sec.categoria);
      if (lista) lista.push(sec);
      else curso.componentes_practicos.set(sec.categoria, [sec]);
    }
  }
  return cursos;
}

/** (anio, periodo) de las llamadas verRestricciones(...) del catálogo, para
 * poder pedir el detalle de restricciones de cada sección. */
export function extraerParamsRestricciones(html: string): { anio: string; periodo: string } | null {
  const m = html.match(/verRestricciones\('[^']+'\s*,\s*'[^']+',\s*'([^']+)',\s*'([^']+)'\)/);
  return m ? { anio: m[1], periodo: m[2] } : null;
}

/** JSON público del catálogo — MISMA forma que servía el server Python. */
export function catalogoJson(html: string, periodo: string) {
  const secciones = parseSecciones(html);
  const cursos = [...agruparCursos(secciones).values()]
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  return {
    semestre: periodo,
    actualizado: new Date().toISOString().slice(0, 16).replace("T", " "),
    desde_cache: false,
    total_cursos: cursos.length,
    restricciones_params: extraerParamsRestricciones(html),
    cursos: cursos.map((c) => ({
      codigo: c.codigo,
      nombre: c.nombre,
      num_secciones: todasLasSecciones(c).length,
      tiene_clase: c.secciones_clase.length > 0,
      componentes_practicos: [...c.componentes_practicos.keys()].sort(),
      secciones: todasLasSecciones(c).map((s) => ({
        seccion: s.seccion,
        categoria: s.categoria,
        modalidad: s.modalidad,
        inicio: s.inicio_min !== null ? minHHMM(s.inicio_min) : null,
        fin: s.fin_min !== null ? minHHMM(s.fin_min) : null,
        dias: s.dias,
        catedratico: s.catedratico,
        auxiliar: s.auxiliar,
        restringida: s.restringida,
      })),
    })),
  };
}

const minHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
