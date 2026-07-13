/** Estado global del frontend.
 *
 * Modelo deliberado: un objeto mutable `E` (idéntico al `estado` de la app
 * original) + un átomo de versión `$v`. Las acciones mutan E y llaman
 * `touch()`; todas las islas React se suscriben a `$v` con useStore y
 * re-renderizan leyendo E. Es el mismo modelo imperativo probado de la app
 * vanilla, con React solo como capa de render — cero lógica reescrita.
 */
import { atom } from "nanostores";
import { esTemaOscuro } from "./temas";
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

/* El chat vive en E como el resto del estado, pero NO se persiste: cada
 * visita arranca con la conversación limpia (el modelo sí queda cacheado). */
import type { AccionIA, OpcionesChat } from "./ia/herramientas";
export interface MensajeChat {
  rol: "usuario" | "ia";
  texto: string;
  hechos?: string[];
  errores?: string[];
  /** Contexto extra que solo ve el modelo (p. ej. listados numerados). */
  notas?: string[];
  /** Alternativas de horario que la UI pinta como tarjetas tocables. */
  opciones?: OpcionesChat | null;
  pendientes?: AccionIA[] | null;
}
export type FaseChat =
  | "cerrado" | "detectando" | "intro" | "cargando" | "listo"
  | "no-disponible" | "error";
export interface ChatIA {
  abierto: boolean;
  fase: FaseChat;
  tier: "chrome" | "webllm" | null;
  progreso: { texto: string; pct: number | null };
  mensajes: MensajeChat[];
  pensando: boolean;
  /** Texto del "mensaje" que Cupito lleva escrito (streaming en vivo). */
  parcial: string;
  /** Pista bajo los puntitos cuando una respuesta tarda (ej. el primer turno). */
  pista: string;
  error: string;
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
  tema: null as string | null,   // id de temas.ts; null = según el sistema
  sidebarOculta: false,
  menuMovil: false,   // drawer móvil abierto (efímero, no se persiste)
  menuTemas: false,   // picker de temas abierto (efímero)
  animTema: null as string | null,   // id de la animación de bienvenida del tema
  /** Invitación de un amigo (llegó por URL #amigo=): sus secciones elegidas. */
  amigo: null as { de: string; secciones: Record<string, Array<{ cat: string; sec: string }>> } | null,
  modalCompartir: false,
  topN: 3,
  /** «generar» = optimizador busca el mejor horario; «consulta» = ya tengo
   * mis secciones y solo quiero verlas armadas (elijo sección por sección). */
  modo: "generar" as "generar" | "consulta",
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
  /** Override visual de la sección mostrada: clave `codigo|categoria` →
   * la sección equivalente que el estudiante quiere ver impresa (p. ej.
   * quedó en la A pero el sistema muestra la B, mismo horario). Solo
   * cosmético — no toca el motor ni las combinaciones. */
  etiquetas: {} as Record<string, string>,
  /** Código del curso cuyo detalle está abierto en el modal (o null). */
  cursoDetalle: null as string | null,
  editor: null as Editor | null,
  chat: {
    abierto: false, fase: "cerrado", tier: null,
    progreso: { texto: "", pct: null }, mensajes: [], pensando: false,
    parcial: "", pista: "", error: "",
  } as ChatIA,
  toast: "",
  modalPensum: false,
  modalAcerca: false,
  modalBienvenida: false,
  modalContribuir: false,   // «cómo subir grupos»
  modalReset: false,        // confirmación de «borrar mis datos»
  menuExportar: false,
};

export const $v = atom(0);
export const touch = () => $v.set($v.get() + 1);

export const paleta = () => (esTemaOscuro(E.tema) ? PALETA_OSCURA : PALETA_CLARA);

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
    modo: E.modo,
    miHorario: E.miHorario,
    etiquetas: E.etiquetas,
    amigo: E.amigo,
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
    E.modo = d.modo === "consulta" ? "consulta" : "generar";
    E.miHorario = d.miHorario || null;
    E.etiquetas = d.etiquetas || {};
    E.amigo = d.amigo || null;
    E.vista = d.vista || null;
  } catch { /* localStorage corrupto: empezar de cero */ }
}
