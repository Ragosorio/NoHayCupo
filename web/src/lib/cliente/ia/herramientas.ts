/** Herramientas del asistente IA.
 *
 * El modelo local NUNCA toca `E` directo: propone acciones en JSON y este
 * módulo las valida contra el catálogo real antes de ejecutar las mismas
 * funciones de acciones.ts que usa el resto de la UI. Si el modelo inventa
 * un curso, un día o una hora, la acción se rechaza con un error legible
 * que vuelve al chat (y al modelo en el siguiente turno).
 */
import {
  agregarCurso, aplicarSwap, comboMostrado, elegirEstrategia, elegirOpcion,
  entrarEditor, estrategiaActiva, generar, limpiarBloqueos, opcionesQueCaben,
  pintarCelda, quitarCurso, salirEditor, setModal,
} from "../acciones";
import { exportarExcel, exportarIcs, exportarPng, exportarPrompt } from "../exportar";
import { E, guardarLocal, touch } from "../estado";
import { ESTRATEGIAS } from "../../engine/strategies";
import {
  aHHMM, aMin, DIAS_NOMBRE, DIAS_ORDEN, GRID_FIN, GRID_INI, nombreBonito,
  normalizar, SLOT_MIN,
} from "../util";

export type AccionIA =
  | { accion: "bloquear"; nivel: "imposible" | "evitar"; dias: string[]; desde: string; hasta: string }
  | { accion: "borrar_bloqueo"; dias: string[]; desde: string; hasta: string }
  | { accion: "limpiar_bloqueos" }
  | { accion: "agregar_curso"; curso: string }
  | { accion: "quitar_curso"; curso: string }
  | { accion: "generar" }
  | { accion: "estrategia"; id: string }
  | { accion: "opcion"; n: number }
  | { accion: "alternativas"; curso: string }
  | { accion: "mover_curso"; curso: string; alternativa?: number }
  | { accion: "exportar"; formato: "png" | "excel" | "ics" | "prompt" }
  | { accion: "compartir" };

export interface RespuestaIA {
  tipo: "acciones" | "respuesta" | "fuera_de_tema";
  mensaje: string;
  acciones: AccionIA[];
}

export interface ResultadoEjecucion {
  hechos: string[];
  errores: string[];
  /** Cola pausada en la primera acción destructiva: la UI pide confirmación
   * y, si el usuario acepta, se reejecuta con `confirmadas: true`. */
  pendientes: AccionIA[] | null;
}

const ACCIONES_VALIDAS = new Set([
  "bloquear", "borrar_bloqueo", "limpiar_bloqueos", "agregar_curso",
  "quitar_curso", "generar", "estrategia", "opcion",
  "alternativas", "mover_curso", "exportar", "compartir",
]);
const DESTRUCTIVAS = new Set(["quitar_curso", "limpiar_bloqueos"]);

/** Parseo defensivo: aunque el decoding restringido garantiza JSON válido,
 * acá se revalida la forma por si el motor degradó a texto libre. */
export function parsearRespuesta(crudo: string): RespuestaIA | null {
  try {
    const d = JSON.parse(crudo);
    if (!d || typeof d !== "object") return null;
    if (!["acciones", "respuesta", "fuera_de_tema"].includes(d.tipo)) return null;
    if (typeof d.mensaje !== "string") return null;
    const acciones = Array.isArray(d.acciones)
      ? d.acciones.filter((a: AccionIA) => a && ACCIONES_VALIDAS.has(a.accion))
      : [];
    return { tipo: d.tipo, mensaje: d.mensaje.trim(), acciones: d.tipo === "acciones" ? acciones : [] };
  } catch { return null; }
}

/* ---------- validación de días y horas ---------- */

const ALIAS_DIA: Record<string, string> = {};
for (const d of DIAS_ORDEN) {
  ALIAS_DIA[d.toLowerCase()] = d;
  ALIAS_DIA[normalizar(DIAS_NOMBRE[d])] = d;
}

function validarDias(dias: unknown): string[] {
  if (!Array.isArray(dias)) return [];
  const out: string[] = [];
  for (const d of dias) {
    const cod = ALIAS_DIA[normalizar(String(d))];
    if (cod && !out.includes(cod)) out.push(cod);
  }
  return out;
}

/** "7", "7:30", "07:30" → minutos ajustados a la rejilla de 30 min. */
function ajustarHora(txt: unknown, modo: "inicio" | "fin"): number | null {
  const m = String(txt ?? "").trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2] ?? 0);
  if (min < 0 || min > 24 * 60) return null;
  const rel = min - GRID_INI;
  const ajustado = GRID_INI + (modo === "inicio"
    ? Math.floor(rel / SLOT_MIN) * SLOT_MIN
    : Math.ceil(rel / SLOT_MIN) * SLOT_MIN);
  return Math.max(GRID_INI, Math.min(GRID_FIN, ajustado));
}

/* ---------- resolución de cursos contra el catálogo real ---------- */

function resolverCurso(texto: string, entre: "catalogo" | "seleccion"):
  { codigo: string; nombre: string } | { error: string } {
  const n = normalizar(String(texto ?? "").trim());
  if (!n) return { error: "No me dijeron qué curso" };
  const cursos = entre === "seleccion"
    ? E.seleccion.map((c) => E.porCodigo.get(c)).filter((c) => !!c)
    : E.catalogo?.cursos ?? [];
  const porCodigo = cursos.find((c) =>
    c.codigo === n || c.codigo === n.padStart(4, "0"));
  if (porCodigo) return { codigo: porCodigo.codigo, nombre: porCodigo.nombre };
  const candidatos = cursos.filter((c) => normalizar(c.nombre).includes(n));
  const exacto = candidatos.find((c) => normalizar(c.nombre) === n);
  if (exacto) return { codigo: exacto.codigo, nombre: exacto.nombre };
  if (candidatos.length === 1) {
    return { codigo: candidatos[0].codigo, nombre: candidatos[0].nombre };
  }
  if (candidatos.length > 1) {
    const lista = candidatos.slice(0, 3)
      .map((c) => `${c.codigo} ${nombreBonito(c.nombre)}`).join(", ");
    return { error: `Hay varios cursos que se llaman así: ${lista}. ¿Cuál querés?` };
  }
  return {
    error: entre === "seleccion"
      ? `«${texto}» no está entre tus cursos elegidos`
      : `No encontré «${texto}» en el catálogo de este periodo`,
  };
}

/* ---------- etiquetas para la UI ---------- */

const NIVEL_ETIQUETA = { imposible: "No puedo", evitar: "Prefiero no" } as const;

export function etiquetaAccion(a: AccionIA): string {
  switch (a.accion) {
    case "bloquear": {
      const nivel = NIVEL_ETIQUETA[a.nivel] ?? a.nivel;
      return `Pintar ${validarDias(a.dias).join("·")} ${a.desde}–${a.hasta} como «${nivel}»`;
    }
    case "borrar_bloqueo": return `Despintar ${validarDias(a.dias).join("·")} ${a.desde}–${a.hasta}`;
    case "limpiar_bloqueos": return "Borrar TODOS los bloqueos pintados";
    case "agregar_curso": return `Agregar el curso «${a.curso}»`;
    case "quitar_curso": return `Quitar el curso «${a.curso}»`;
    case "generar": return "Generar horarios de nuevo";
    case "estrategia": return `Ordenar por «${ESTRATEGIAS[a.id]?.nombre ?? a.id}»`;
    case "opcion": return `Mostrar la opción ${a.n}`;
    case "alternativas": return `Buscar alternativas para «${a.curso}»`;
    case "mover_curso": return `Mover «${a.curso}» a otra sección`;
    case "exportar": return `Exportar el horario (${a.formato})`;
    case "compartir": return "Abrir el panel de compartir";
  }
}

/* ---------- alternativas del combo mostrado ---------- */

/** Curso → alternativas que caben, con numeración ESTABLE mientras no cambie
 * el combo mostrado: «alternativas» lista y «mover_curso» elige por número
 * recomputando la misma lista (no se guarda nada entre turnos). */
function alternativasDelMostrado(texto: string) {
  const mostrado = comboMostrado();
  if (!mostrado || !E.resultado) {
    return { error: "Todavía no hay un horario en pantalla — primero hay que generar" };
  }
  const r = resolverCurso(texto, "seleccion");
  if ("error" in r) return r;
  const ids = new Map(mostrado.map((c) => [c.codigo, c.opcionId]));
  if (!ids.has(r.codigo)) {
    return { error: `${r.codigo} no está en el horario mostrado (quedó fuera por tus bloqueos)` };
  }
  return { ...r, alternativas: opcionesQueCaben(r.codigo, ids) };
}

function describirAlternativas(alts: ReturnType<typeof opcionesQueCaben>): string {
  return alts.map((a, i) =>
    `${i + 1}) ${a.etiqueta}: ${a.componentes
      .map((c) => `${c.dias.join("·")} ${c.inicio}–${c.fin}`).join(" + ")}`,
  ).join(" — ");
}

/* ---------- ejecución ---------- */

async function ejecutarUna(a: AccionIA): Promise<{ hecho?: string; error?: string }> {
  switch (a.accion) {
    case "bloquear":
    case "borrar_bloqueo": {
      const dias = validarDias(a.dias);
      if (!dias.length) return { error: "No reconocí los días (usá LU, MA, MI, JU, VI, SA, DO)" };
      const desde = ajustarHora(a.desde, "inicio");
      const hasta = ajustarHora(a.hasta, "fin");
      if (desde == null || hasta == null || desde >= hasta) {
        return { error: `El rango ${a.desde}–${a.hasta} no es un horario válido (la rejilla va de 06:30 a 21:30)` };
      }
      const pincel = a.accion === "bloquear" ? a.nivel : "borrar";
      if (pincel !== "borrar" && pincel !== "imposible" && pincel !== "evitar") {
        return { error: `Nivel de bloqueo desconocido: «${(a as { nivel?: string }).nivel}»` };
      }
      for (const dia of dias) {
        for (let min = desde; min < hasta; min += SLOT_MIN) pintarCelda(dia, min, pincel);
      }
      guardarLocal();
      touch();
      const rango = `${dias.join("·")} ${aHHMM(desde)}–${aHHMM(hasta)}`;
      return {
        hecho: a.accion === "bloquear"
          ? `Pinté ${rango} como «${NIVEL_ETIQUETA[a.nivel]}»`
          : `Despinté ${rango}`,
      };
    }
    case "limpiar_bloqueos": {
      if (!E.bloqueos.size) return { hecho: "No había bloqueos pintados" };
      limpiarBloqueos();
      return { hecho: "Borré todos los bloqueos" };
    }
    case "agregar_curso": {
      const r = resolverCurso(a.curso, "catalogo");
      if ("error" in r) return { error: r.error };
      if (E.seleccion.includes(r.codigo)) {
        return { hecho: `${r.codigo} ${nombreBonito(r.nombre)} ya estaba en tu selección` };
      }
      agregarCurso(r.codigo);
      return { hecho: `Agregué ${r.codigo} — ${nombreBonito(r.nombre)}` };
    }
    case "quitar_curso": {
      const r = resolverCurso(a.curso, "seleccion");
      if ("error" in r) return { error: r.error };
      quitarCurso(r.codigo);
      return { hecho: `Quité ${r.codigo} — ${nombreBonito(r.nombre)}` };
    }
    case "generar": {
      if (!E.seleccion.length) return { error: "No hay cursos elegidos todavía" };
      await generar();
      const res = E.resultado;
      if (!res) return { error: E.estadoGenerar || "No se pudo generar" };
      if (!res.total_validas) {
        const sac = res.sacrificios[0];
        return {
          hecho: sac
            ? `Generé, pero ninguna combinación cumple todo. Quitar ${sac.codigo} destrabaría ${sac.combinaciones} combinaciones`
            : "Generé, pero ninguna combinación cumple todo",
        };
      }
      return { hecho: `Generé ${res.total_validas.toLocaleString()} combinaciones válidas` };
    }
    case "estrategia": {
      const meta = ESTRATEGIAS[a.id];
      if (!meta) return { error: `No existe la estrategia «${a.id}»` };
      elegirEstrategia(a.id);
      return { hecho: `Ordené por «${meta.nombre}»` };
    }
    case "opcion": {
      const combos = estrategiaActiva()?.combos ?? [];
      const n = Math.trunc(Number(a.n));
      if (!combos.length) return { error: "Todavía no hay horarios generados" };
      if (!(n >= 1 && n <= combos.length)) {
        return { error: `Solo hay ${combos.length} opciones en esta estrategia` };
      }
      elegirOpcion(n - 1);
      return { hecho: `Te puse la opción ${n}` };
    }
    case "alternativas": {
      const r = alternativasDelMostrado(a.curso);
      if ("error" in r) return { error: r.error };
      if (!r.alternativas.length) {
        return { hecho: `${r.codigo} ${nombreBonito(r.nombre)} no tiene otra sección que quepa con el resto del horario` };
      }
      return { hecho: `Alternativas para ${r.codigo}: ${describirAlternativas(r.alternativas)}` };
    }
    case "mover_curso": {
      const r = alternativasDelMostrado(a.curso);
      if ("error" in r) return { error: r.error };
      if (!r.alternativas.length) {
        return { error: `${r.codigo} no tiene otra sección que quepa con el resto del horario` };
      }
      let elegida;
      if (a.alternativa != null) {
        const n = Math.trunc(Number(a.alternativa));
        if (!(n >= 1 && n <= r.alternativas.length)) {
          return { error: `Solo hay ${r.alternativas.length} alternativas para ${r.codigo}` };
        }
        elegida = r.alternativas[n - 1];
      } else if (r.alternativas.length === 1) {
        elegida = r.alternativas[0];
      } else {
        return { hecho: `Para ${r.codigo} caben: ${describirAlternativas(r.alternativas)}. Decime a cuál lo muevo (el número)` };
      }
      // El mismo flujo que «Ajustar» a mano: el resultado queda guardado
      // como «Mi horario» y el combo original no se pierde.
      entrarEditor();
      aplicarSwap(r.codigo, elegida.id);
      salirEditor(true);
      return { hecho: `Moví ${r.codigo} a ${elegida.etiqueta}; quedó guardado como «Mi horario»` };
    }
    case "exportar": {
      if (!comboMostrado()) return { error: "Primero generá un horario para exportarlo" };
      if (a.formato === "png") { exportarPng(); return { hecho: "Descargué tu horario como imagen PNG" }; }
      if (a.formato === "excel") { exportarExcel(); return { hecho: "Descargué tu horario como Excel (.csv)" }; }
      if (a.formato === "ics") { exportarIcs(); return { hecho: "Descargué el .ics — importalo en Google Calendar" }; }
      if (a.formato === "prompt") { await exportarPrompt(); return { hecho: "Copié el prompt con todos tus datos al portapapeles" }; }
      return { error: `No sé exportar a «${(a as { formato?: string }).formato}» (hay png, excel, ics y prompt)` };
    }
    case "compartir": {
      if (!comboMostrado()) return { error: "Primero generá un horario para compartirlo" };
      setModal("compartir", true);
      return { hecho: "Abrí el panel de compartir — desde ahí copiás el enlace para tus amigos" };
    }
  }
}

export async function ejecutarAcciones(
  lista: AccionIA[], confirmadas = false,
): Promise<ResultadoEjecucion> {
  const hechos: string[] = [];
  const errores: string[] = [];
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (!confirmadas && DESTRUCTIVAS.has(a.accion)) {
      // Pausar acá y no después: lo que sigue (p. ej. un generar) depende
      // de que la destructiva se haya aplicado.
      return { hechos, errores, pendientes: lista.slice(i) };
    }
    const r = await ejecutarUna(a);
    if (r.hecho) hechos.push(r.hecho);
    if (r.error) errores.push(r.error);
  }
  return { hechos, errores, pendientes: null };
}
