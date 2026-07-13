/** Orquestación del chat: acciones que mutan E.chat y hablan con el motor.
 * Sigue el patrón de la app (mutar E + touch()); la isla solo llama esto. */
import { E, touch, type MensajeChat } from "../estado";
import { ejecutarAcciones, parsearRespuesta, type AccionIA } from "./herramientas";
import { construirMensajes, MENSAJE_FUERA_DE_TEMA, SCHEMA_RESPUESTA } from "./prompt";
import { crearMotor, detectarTier, type MotorIA } from "./motor";

/** El motor NO vive en E: es un objeto pesado con el modelo cargado, no
 * estado serializable. Muere con la pestaña; el modelo queda cacheado. */
let motor: MotorIA | null = null;

const LS_ACTIVADA = "nhc_ia";   // "1" = el usuario ya activó la IA antes

const SALUDO = "¡Hola! Soy Cupito. Contame tu semestre y lo armamos: qué "
  + "cursos llevás, en qué horas trabajás o no podés, y qué preferís (salir "
  + "temprano, un día libre…). También podés preguntarme cómo funciona la app "
  + "o sobre Ragosorio.";

function pushIA(m: Partial<MensajeChat> & { texto: string }) {
  E.chat.mensajes.push({ rol: "ia", ...m });
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Escribe un mensaje de Cupito con efecto de tipeo (reusa la burbuja de
 * streaming). Si el panel está cerrado no vale la pena animar: se empuja
 * directo. Solo para mensajes que NO vienen del modelo (el saludo). */
async function tipear(texto: string) {
  if (!E.chat.abierto) { pushIA({ texto }); touch(); return; }
  E.chat.pensando = true;
  E.chat.parcial = "";
  touch();
  const paso = Math.max(1, Math.round(texto.length / 70));
  for (let i = paso; i < texto.length; i += paso) {
    E.chat.parcial = texto.slice(0, i);
    touch();
    await dormir(16);
  }
  E.chat.pensando = false;
  E.chat.parcial = "";
  pushIA({ texto });
  touch();
}

/* ---------- acompañamiento visual ---------- */

/** A qué parte de la app llevar la vista según lo que Cupito tocó. */
function focoDe(acciones: AccionIA[]): string | null {
  const tipos = new Set(acciones.map((a) => a.accion));
  const alguno = (...ts: string[]) => ts.some((t) => tipos.has(t as AccionIA["accion"]));
  if (alguno("generar", "opcion", "estrategia", "mover_curso", "alternativas")) return ".calendario";
  if (alguno("bloquear", "borrar_bloqueo", "limpiar_bloqueos")) return "#panelTiempo";
  if (alguno("agregar_curso", "quitar_curso")) return "#panelCursos";
  return null;
}

/** Scrollea a la sección que Cupito editó y le da un destello, para que se
 * VEA qué cambió. Si el elemento está oculto (drawer móvil cerrado), no. */
function resaltarSeccion(selector: string | null) {
  if (!selector || typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || !el.offsetParent) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("destello-ia");
  void el.offsetWidth;   // reinicia la animación si ya estaba corriendo
  el.classList.add("destello-ia");
  setTimeout(() => el.classList.remove("destello-ia"), 2200);
}

/* ---------- streaming del mensaje ---------- */

/** Saca el campo "mensaje" del JSON a medio generar, para mostrarlo mientras
 * Cupito escribe. Si el turno viene fuera_de_tema no se muestra nada (ese
 * texto igual se descarta al final). */
function mensajeParcial(acumulado: string): string {
  if (acumulado.includes('"fuera_de_tema"')) return "";
  const m = acumulado.match(/"mensaje"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return "";
  try { return JSON.parse(`"${m[1]}"`); } catch { return ""; }
}

export function alternarChat() {
  E.chat.abierto = !E.chat.abierto;
  touch();
  if (E.chat.abierto && E.chat.fase === "cerrado") void prepararChat();
}

export function cerrarChat() {
  if (!E.chat.abierto) return;
  E.chat.abierto = false;
  touch();
}

/** Al arrancar la app: si el usuario ya había activado a Cupito, cargar el
 * modelo de una vez EN SEGUNDO PLANO (como subvid) — el botón de la topbar
 * muestra el progreso y, al abrir el chat, ya está listo o cargando. */
export async function precargarIA() {
  if (E.chat.fase !== "cerrado") return;
  if (localStorage.getItem(LS_ACTIVADA) !== "1") return;
  E.chat.fase = "detectando";
  E.chat.tier = await detectarTier();
  if (!E.chat.tier) { E.chat.fase = "no-disponible"; touch(); return; }
  await activarIA();
}

async function prepararChat() {
  E.chat.fase = "detectando";
  touch();
  const tier = await detectarTier();
  E.chat.tier = tier;
  if (!tier) {
    E.chat.fase = "no-disponible";
  } else if (localStorage.getItem(LS_ACTIVADA) === "1") {
    // Ya la activó antes: el modelo está en caché, cargar directo.
    return activarIA();
  } else {
    E.chat.fase = "intro";
  }
  touch();
}

export async function activarIA() {
  if (!E.chat.tier) return;
  E.chat.fase = "cargando";
  E.chat.progreso = { texto: "Preparando el motor…", pct: null };
  touch();
  try {
    motor = await crearMotor(E.chat.tier, (p) => { E.chat.progreso = p; touch(); });
    // La descarga pesada pasa ACÁ, con la barra de progreso a la vista —
    // nunca escondida detrás del primer «Pensando…».
    await motor.preparar?.();
    localStorage.setItem(LS_ACTIVADA, "1");
    E.chat.fase = "listo";
    E.chat.progreso = { texto: "", pct: null };
    touch();
    if (!E.chat.mensajes.length) await tipear(SALUDO);
  } catch (e) {
    localStorage.removeItem(LS_ACTIVADA);
    E.chat.fase = "error";
    E.chat.error = (e as Error).message || "No se pudo cargar el modelo";
  }
  touch();
}

export async function enviarMensaje(texto: string) {
  const limpio = texto.trim();
  if (!limpio || !motor || E.chat.pensando) return;
  /* El historial que ve el modelo incluye qué se APLICÓ y qué falló de sus
   * turnos anteriores: sin eso no puede corregir («no, eso era "evitar"»)
   * ni retomar un listado de alternativas que él mismo dio. */
  const historial = E.chat.mensajes
    .filter((m) => m.texto || m.hechos?.length || m.errores?.length)
    .map((m) => ({
      rol: m.rol,
      texto: m.rol === "ia"
        ? [m.texto,
            ...(m.hechos ?? []).map((h) => `[hecho] ${h}`),
            ...(m.notas ?? []).map((n) => `[hecho] ${n}`),
            ...(m.errores ?? []).map((e) => `[falló] ${e}`),
          ].filter(Boolean).join("\n")
        : m.texto,
    }));
  E.chat.mensajes.push({ rol: "usuario", texto: limpio });
  E.chat.pensando = true;
  E.chat.parcial = "";
  E.chat.pista = "";
  E.chat.progreso = { texto: "", pct: null };
  touch();

  const primerTurno = E.chat.mensajes.filter((m) => m.rol === "ia").length <= 1;
  /* Aviso de lentitud: la PRIMERA respuesta paga el prefill del prompt del
   * sistema y arranca el modelo — puede tardar. Sin esta pista, el usuario
   * ve solo puntitos y cree que se colgó. */
  const avisoLento = setTimeout(() => {
    E.chat.pista = primerTurno
      ? "La primera respuesta tarda un poco más (Cupito está arrancando)…"
      : "Dame un segundo, estoy pensando…";
    touch();
  }, 9000);
  /* Cuelgue de verdad: si a los 2 min no salió nada, cortar y avisar en vez
   * de dejar los puntitos para siempre (visto en WebGPU con prefill largo). */
  let venció = false;
  const timeout = setTimeout(() => {
    venció = true;
    motor?.abortar?.();
  }, 120000);

  try {
    const crudo = await motor.generarJSON(
      construirMensajes(historial, limpio), SCHEMA_RESPUESTA,
      (acumulado) => {
        clearTimeout(avisoLento);
        if (E.chat.pista) E.chat.pista = "";   // ya está escribiendo
        const p = mensajeParcial(acumulado);
        if (p !== E.chat.parcial) { E.chat.parcial = p; touch(); }
      },
    );
    if (venció) throw new Error("timeout");
    const r = parsearRespuesta(crudo);
    if (!r) {
      pushIA({ texto: "No logré entender eso. ¿Me lo decís de otra forma?" });
    } else if (r.tipo === "fuera_de_tema") {
      // Plantilla fija: lo que el modelo haya escrito acá no se muestra.
      pushIA({ texto: MENSAJE_FUERA_DE_TEMA });
    } else if (r.tipo === "respuesta" || !r.acciones.length) {
      pushIA({ texto: r.mensaje || "Listo." });
    } else {
      const { hechos, errores, notas, opciones, pendientes } = await ejecutarAcciones(r.acciones);
      pushIA({ texto: r.mensaje || "Listo.", hechos, errores, notas, opciones, pendientes });
      if (hechos.length) resaltarSeccion(focoDe(r.acciones));
    }
  } catch (e) {
    pushIA({
      texto: venció
        ? "Uf, esta se me trabó (tu equipo se quedó sin fuelle para esta consulta). Probá con algo más corto o volvé a intentar."
        : `Algo falló generando la respuesta (${(e as Error).message}). Probá de nuevo.`,
    });
  } finally {
    clearTimeout(avisoLento);
    clearTimeout(timeout);
  }
  E.chat.pensando = false;
  E.chat.parcial = "";
  E.chat.pista = "";
  touch();
}

/** Confirmación de acciones destructivas: se reejecuta la cola pausada. */
export async function confirmarPendientes(mensaje: MensajeChat) {
  const cola = mensaje.pendientes as AccionIA[] | null;
  if (!cola) return;
  mensaje.pendientes = null;
  E.chat.pensando = true;
  touch();
  const { hechos, errores, notas, opciones } = await ejecutarAcciones(cola, true);
  mensaje.hechos = [...(mensaje.hechos ?? []), ...hechos];
  mensaje.errores = [...(mensaje.errores ?? []), ...errores];
  mensaje.notas = [...(mensaje.notas ?? []), ...notas];
  if (opciones) mensaje.opciones = opciones;
  E.chat.pensando = false;
  touch();
  if (hechos.length) resaltarSeccion(focoDe(cola));
}

/** El usuario tocó una tarjeta de alternativa: mover el curso ahí mismo,
 * sin pasar por el modelo (la elección ya es inequívoca). */
export async function elegirAlternativa(mensaje: MensajeChat, curso: string, n: number) {
  if (E.chat.pensando) return;
  mensaje.opciones = null;   // consumidas: que no queden tarjetas viejas
  const r = await ejecutarAcciones([{ accion: "mover_curso", curso, alternativa: n }], true);
  pushIA({ texto: "", hechos: r.hechos, errores: r.errores });
  touch();
  if (r.hechos.length) resaltarSeccion(".calendario");
}

export function descartarPendientes(mensaje: MensajeChat) {
  if (!mensaje.pendientes) return;
  mensaje.pendientes = null;
  mensaje.hechos = [...(mensaje.hechos ?? []), "Dejé eso como estaba"];
  touch();
}
