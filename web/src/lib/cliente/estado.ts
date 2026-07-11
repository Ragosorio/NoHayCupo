/** Estado global del frontend.
 *
 * Modelo deliberado: un objeto mutable `E` (idéntico al `estado` de la app
 * original) + un átomo de versión `$v`. Las acciones mutan E y llaman
 * `touch()`; todas las islas React se suscriben a `$v` con useStore y
 * re-renderizan leyendo E. Es el mismo modelo imperativo probado de la app
 * vanilla, con React solo como capa de render — cero lógica reescrita.
 */
import { atom } from "nanostores";
import { PALETA_CLARA, PALETA_OSCURA } from "./util";

export interface ComponenteJson {
  categoria: string;
  seccion: string;
  catedratico: string;
  auxiliar: string | null;
  restringida: boolean;
  inicio: string;
  fin: string;
  dias: string[];
  equivalentes: Array<{ seccion: string; catedratico: string }>;
}
export interface OpcionJson { componentes: ComponenteJson[]; etiqueta: string }
export interface ComboJson {
  metrics: MetricsJson;
  cursos: Array<{ codigo: string; nombre: string; opcion_id: number } & OpcionJson>;
  emergencia: Record<string, OpcionJson[]>;
}
export interface MetricsJson {
  minutos_en_evitar: number;
  horas_en_evitar: number;
  minutos_evitar_totales: number;
  dias_libres: string[];
  num_dias_con_clase: number;
  usa_sabado: boolean;
  min_bloque_libre_h: number;
}
export interface Resultado {
  total_validas: number;
  cursos_incluidos: string[];
  excluidos_por_bloqueos: string[];
  sacrificios: Array<{ codigo: string; nombre: string; combinaciones: number }>;
  hay_bloqueos: boolean;
  minutos_evitar_totales: number;
  advertencias: string[];
  opciones: Record<string, OpcionJson[]>;
  estrategias: Array<{ id: string; nombre: string; descripcion: string; combos: ComboJson[] }>;
}
export interface CursoCatalogo {
  codigo: string; nombre: string; num_secciones: number; tiene_clase: boolean;
  componentes_practicos: string[];
  secciones: Array<{
    seccion: string; categoria: string | null; modalidad: string;
    inicio: string | null; fin: string | null; dias: string[];
    catedratico: string; auxiliar: string | null; restringida: boolean;
  }>;
}
export interface Catalogo {
  semestre: string; actualizado: string; desde_cache: boolean; total_cursos: number;
  restricciones_params: { anio: string; periodo: string } | null;
  cursos: CursoCatalogo[];
}
export interface Editor {
  ids: Map<string, number>;
  seleccionado: string | null;
  undo: Array<Map<string, number>>;
}

export const E = {
  semestre: "2",
  catalogo: null as Catalogo | null,
  porCodigo: new Map<string, CursoCatalogo>(),
  estadoCatalogo: "",
  seleccion: [] as string[],
  manuales: new Set<string>(),
  excluidos: new Set<string>(),
  sync: false,
  restringidas: {} as Record<string, Set<string>>,
  overrides: new Set<string>(),
  restric: {} as Record<string, Record<string, { veredicto: string; detalle: string[] }>>,
  carnet: "",
  bloqueos: new Map<string, "imposible" | "evitar">(),
  pincel: "imposible" as "imposible" | "evitar" | "borrar",
  tema: null as "light" | "dark" | null,
  sidebarOculta: false,
  menuMovil: false,   // drawer móvil abierto (efímero, no se persiste)
  topN: 3,
  resultado: null as Resultado | null,
  estadoGenerar: "",
  estrategia: null as string | null,
  opcion: 0 as number | "mia",
  miHorario: null as { codigos: string[]; ids: Record<string, number> } | null,
  vista: null as { generado: boolean; estrategia: string | null; opcion: number | "mia" } | null,
  pensum: null as Array<{ codigo: string; nombre: string; creditos: number | null; semestre: number | null; prerrequisitos: string[] }> | null,
  pensumPorCodigo: new Map<string, { codigo: string; creditos: number | null; prerrequisitos: string[] }>(),
  pensumInfo: "",
  pensumMeta: "",
  aprobados: new Set<string>(),
  aprobadosPor: {} as Record<string, string[]>,
  indicePensums: [] as Array<{ id: number; carrera: string; plan: string; vigencia_desde: number }>,
  carrera: "Ingeniería en Ciencias y Sistemas",
  pensumId: null as number | null,
  editor: null as Editor | null,
  toast: "",
  modalPensum: false,
  modalAcerca: false,
  modalBienvenida: false,
  menuExportar: false,
};

export const $v = atom(0);
export const touch = () => $v.set($v.get() + 1);

export const paleta = () => (E.tema === "dark" ? PALETA_OSCURA : PALETA_CLARA);

export const colorDe = (codigo: string): [string, string, string] => {
  const orden = E.resultado?.cursos_incluidos?.length
    ? E.resultado.cursos_incluidos : E.seleccion;
  const i = orden.indexOf(codigo);
  return paleta()[(i < 0 ? 0 : i) % paleta().length];
};

/* ---------- persistencia (localStorage: nada sale de tu navegador) ---------- */

export function guardarLocal() {
  localStorage.setItem("nhc", JSON.stringify({
    semestre: E.semestre,
    seleccion: E.seleccion,
    manuales: [...E.manuales],
    excluidos: [...E.excluidos],
    sync: E.sync,
    restringidas: Object.fromEntries(Object.entries(E.restringidas).map(([k, v]) => [k, [...v]])),
    overrides: [...E.overrides],
    carnet: E.carnet,
    carrera: E.carrera,
    bloqueos: [...E.bloqueos],
    aprobadosPor: {
      ...E.aprobadosPor,
      ...(E.pensumId != null ? { [E.pensumId]: [...E.aprobados] } : {}),
    },
    tema: E.tema,
    sidebarOculta: E.sidebarOculta,
    topN: E.topN,
    miHorario: E.miHorario,
    vista: E.resultado
      ? { generado: true, estrategia: E.estrategia, opcion: E.opcion }
      : E.vista,
  }));
}

export function cargarLocal() {
  try {
    const d = JSON.parse(localStorage.getItem("nhc") || "{}");
    if (d.semestre) E.semestre = d.semestre;
    E.seleccion = d.seleccion || [];
    E.manuales = new Set(d.manuales || d.seleccion || []);
    E.excluidos = new Set(d.excluidos || []);
    E.sync = !!d.sync;
    E.restringidas = {};
    for (const [k, v] of Object.entries(d.restringidas || {})) {
      E.restringidas[k] = new Set(v as string[]);
    }
    E.overrides = new Set(d.overrides || []);
    E.carnet = d.carnet || "";
    E.carrera = d.carrera || "Ingeniería en Ciencias y Sistemas";
    E.bloqueos = new Map(d.bloqueos || []);
    E.aprobadosPor = d.aprobadosPor || {};
    if (d.aprobados && !d.aprobadosPor) E.aprobadosPor = { 28: d.aprobados };
    E.tema = d.tema || null;
    E.sidebarOculta = !!d.sidebarOculta;
    E.topN = d.topN || 3;
    E.miHorario = d.miHorario || null;
    E.vista = d.vista || null;
  } catch { /* localStorage corrupto: empezar de cero */ }
}
