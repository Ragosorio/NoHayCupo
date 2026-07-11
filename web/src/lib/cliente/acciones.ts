/** Acciones del frontend — puerto 1:1 de la lógica de app.js.
 * Mutan `E`, llaman `touch()` para re-renderizar y `guardarLocal()` donde
 * la app original lo hacía. Las islas React solo llaman funciones de acá. */
import { evaluarReglas } from "../scraper/restricciones";
import {
  cargarLocal, E, guardarLocal, touch,
  type CursoCatalogo, type ComboJson, type OpcionJson,
} from "./estado";
import { generarResultado, metricasDeOpciones, type BloqueoRango } from "./generarCliente";
import { TEMAS, temaPorId } from "./temas";
import {
  aHHMM, aMin, debounce, DIAS_ORDEN, GRID_FIN, GRID_INI, normalizar, SLOT_MIN,
} from "./util";

/* ---------- toast ---------- */

let toastTimer: ReturnType<typeof setTimeout>;
export function toast(msg: string) {
  E.toast = msg;
  touch();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { E.toast = ""; touch(); }, 2600);
}

/* ---------- tema ---------- */

/** Favicon y <meta theme-color> acompañan al tema: la pestaña del navegador
 * se pinta del acento elegido. */
function actualizarCromoDelNavegador() {
  const t = temaPorId(E.tema) ?? TEMAS[0];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>`
    + `<rect width='100' height='100' rx='22' fill='${t.acento}'/>`
    + `<text x='50' y='62' font-size='34' text-anchor='middle' fill='${t.acentoTinta}'`
    + ` font-family='system-ui' font-weight='900' letter-spacing='-2.5'>NHC</text></svg>`;
  let icono = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!icono) {
    icono = document.createElement("link");
    icono.rel = "icon";
    document.head.appendChild(icono);
  }
  icono.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  document.querySelectorAll("meta[name='theme-color']").forEach((m, i) => i > 0 && m.remove());
  let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.removeAttribute("media");
  meta.content = t.marco;
}

export function aplicarTema() {
  if (!temaPorId(E.tema)) {
    E.tema = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = E.tema!;
  actualizarCromoDelNavegador();
  touch();
}

let animTimer: ReturnType<typeof setTimeout>;
export function cambiarTema(id: string) {
  const t = temaPorId(id);
  if (!t) return;
  E.tema = id;
  E.menuTemas = false;
  document.documentElement.dataset.theme = id;
  actualizarCromoDelNavegador();
  if (t.animacion && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    E.animTema = t.animacion;
    clearTimeout(animTimer);
    animTimer = setTimeout(() => { E.animTema = null; touch(); }, 3200);
  }
  guardarLocal();
  touch();
}

/* En móvil el panel lateral es un drawer sobre el contenido; en desktop se
 * pliega/despliega en el grid. El mismo botón hace ambas cosas. */
export const esMovil = () => matchMedia("(max-width: 980px)").matches;

export function abrirMenuMovil() {
  E.menuMovil = true;
  document.body.classList.add("menu-movil");
  touch();
}

export function cerrarMenuMovil() {
  if (!E.menuMovil) return;
  E.menuMovil = false;
  document.body.classList.remove("menu-movil");
  touch();
}

export function alternarSidebar() {
  if (esMovil()) {
    E.menuMovil ? cerrarMenuMovil() : abrirMenuMovil();
    return;
  }
  E.sidebarOculta = !E.sidebarOculta;
  document.body.classList.toggle("sidebar-oculta", E.sidebarOculta);
  guardarLocal();
  touch();
}

/* ---------- catálogo ---------- */

export async function cargarCatalogo(refresh = false) {
  E.estadoCatalogo = refresh ? "Descargando catálogo…" : "Cargando catálogo…";
  touch();
  try {
    const r = await fetch(`/api/catalogo/${encodeURIComponent(E.semestre)}${refresh ? `?t=${Date.now()}` : ""}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    E.catalogo = data;
    E.porCodigo = new Map(data.cursos.map((c: CursoCatalogo) => [c.codigo, c]));
    E.seleccion = E.seleccion.filter((c) => E.porCodigo.has(c));
    E.estadoCatalogo = data.total_cursos === 0
      ? "Este periodo aún no tiene catálogo publicado"
      : `${data.total_cursos} cursos · ${data.actualizado}`;
    sincronizarConPensum();
    touch();
    pedirRestricciones();
    autoMostrarUltimoHorario();
  } catch (e) {
    E.estadoCatalogo = `Error: ${(e as Error).message}`;
    touch();
  }
}

export function cambiarPeriodo(valor: string) {
  E.semestre = valor;
  guardarLocal();
  cargarCatalogo(false);
}

/* ---------- restauración de la última vista ---------- */

let _autoMostrado = false;
async function autoMostrarUltimoHorario() {
  if (_autoMostrado || E.resultado) return;
  if (!E.vista?.generado || !E.seleccion.length) return;
  _autoMostrado = true;
  const vista = E.vista;
  await generar();
  if (!E.resultado) return;
  if (E.resultado.estrategias.some((e) => e.id === vista.estrategia)) {
    E.estrategia = vista.estrategia;
  }
  const combos = estrategiaActiva()?.combos ?? [];
  if (vista.opcion === "mia" && E.miHorario) E.opcion = "mia";
  else if (typeof vista.opcion === "number" && vista.opcion < combos.length) {
    E.opcion = vista.opcion;
  }
  guardarLocal();
  touch();
}

/* ---------- pénsum (multi-carrera, por carnet) ---------- */

function anioCarnet(): number | null {
  const m = (E.carnet || "").match(/^(20\d{2})/);
  return m ? Number(m[1]) : null;
}

function pensumParaEstudiante() {
  const deCarrera = E.indicePensums.filter((p) => p.carrera === E.carrera);
  if (!deCarrera.length) return null;
  const anio = anioCarnet();
  const masNuevo = (lista: typeof deCarrera) => lista.reduce((mejor, p) =>
    (p.vigencia_desde > mejor.vigencia_desde ||
      (p.vigencia_desde === mejor.vigencia_desde && p.id > mejor.id)) ? p : mejor);
  const candidatos = anio ? deCarrera.filter((p) => p.vigencia_desde <= anio) : deCarrera;
  if (candidatos.length) return masNuevo(candidatos);
  return deCarrera.reduce((mejor, p) =>
    (p.vigencia_desde < mejor.vigencia_desde ||
      (p.vigencia_desde === mejor.vigencia_desde && p.id > mejor.id)) ? p : mejor);
}

export async function cargarIndicePensums() {
  try {
    const r = await fetch("/api/pensums");
    E.indicePensums = (await r.json()).pensums ?? [];
  } catch { E.indicePensums = []; }
  touch();
  await elegirPensum();
}

export async function elegirPensum() {
  const meta = pensumParaEstudiante();
  if (!meta) { E.pensumMeta = ""; touch(); return; }
  E.pensumMeta = `${meta.plan} ${meta.vigencia_desde}${anioCarnet() ? " · según tu carnet" : ""}`;
  if (meta.id === E.pensumId) { touch(); return; }
  if (E.pensumId != null) E.aprobadosPor[E.pensumId] = [...E.aprobados];
  E.pensumId = meta.id;
  E.aprobados = new Set(E.aprobadosPor[meta.id] ?? []);
  touch();
  await cargarPensum(meta.id);
}

async function cargarPensum(pensumId: number) {
  try {
    const r = await fetch(`/api/pensum/${pensumId}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    if (E.pensumId !== pensumId) return;   // el usuario cambió mientras bajaba
    E.pensum = data.cursos;
    E.pensumPorCodigo = new Map(data.cursos.map((c: { codigo: string }) => [c.codigo, c]));
    E.pensumInfo = `${data.plan || ""} ${data.vigencia_desde || ""} · ${data.cursos.length} cursos · ${data.total_creditos} créditos`;
    sincronizarConPensum();
    touch();
  } catch (e) {
    E.pensumInfo = `No se pudo cargar el pénsum: ${(e as Error).message}`;
    touch();
  }
}

export function cursosElegibles() {
  if (!E.pensum) return [];
  return E.pensum.filter((c) =>
    !E.aprobados.has(c.codigo) &&
    c.prerrequisitos.every((p) => E.aprobados.has(p)));
}

export function creditosAprobados() {
  let total = 0;
  for (const cod of E.aprobados) {
    total += E.pensumPorCodigo.get(cod)?.creditos ?? 0;
  }
  return total;
}

export function sincronizarConPensum() {
  if (!E.pensum || !E.catalogo) return;
  const elegibles = new Set(cursosElegibles().map((c) => c.codigo));
  if (!E.sync) {
    E.seleccion = E.seleccion.filter((cod) => !E.aprobados.has(cod));
    return;
  }
  E.seleccion = E.seleccion.filter((cod) => {
    if (E.aprobados.has(cod)) return false;
    if (E.manuales.has(cod)) return true;
    if (!E.pensumPorCodigo.has(cod)) return true;
    return elegibles.has(cod);
  });
  for (const c of cursosElegibles()) {
    if (E.porCodigo.has(c.codigo) && !E.seleccion.includes(c.codigo) &&
        !E.excluidos.has(c.codigo)) {
      E.seleccion.push(c.codigo);
    }
  }
}

export function agregarElegibles() {
  const nuevos = cursosElegibles()
    .filter((c) => E.porCodigo.has(c.codigo) && !E.seleccion.includes(c.codigo))
    .map((c) => c.codigo);
  E.seleccion.push(...nuevos);
  nuevos.forEach((cod) => E.excluidos.delete(cod));
  guardarLocal();
  touch();
  pedirRestricciones();
}

export function alternarAprobado(codigo: string, aprobado: boolean) {
  if (aprobado) E.aprobados.add(codigo);
  else E.aprobados.delete(codigo);
  sincronizarConPensum();
  guardarLocal();
  touch();
  pedirRestricciones();
}

export function cambiarCarnet(valor: string) {
  E.carnet = valor.trim();
  guardarLocal();
  touch();
  pedirRestricciones();
  elegirPensum();
}

export function cambiarCarrera(valor: string) {
  E.carrera = valor;
  guardarLocal();
  touch();
  elegirPensum();
  pedirRestricciones();
}

export function cambiarSync(activo: boolean) {
  E.sync = activo;
  if (activo) E.excluidos.clear();
  sincronizarConPensum();
  guardarLocal();
  touch();
  pedirRestricciones();
}

/* ---------- cursos ---------- */

export function buscarCursos(q: string) {
  const nq = normalizar(q.trim());
  if (!nq || !E.catalogo) return [];
  return E.catalogo.cursos
    .filter((c) => !E.seleccion.includes(c.codigo))
    .filter((c) => c.codigo.startsWith(nq) || normalizar(c.nombre).includes(nq))
    .slice(0, 12);
}

export function etiquetaComponentes(curso: CursoCatalogo): string | null {
  const practicos = curso.componentes_practicos ?? [];
  if (!practicos.length) return null;
  const partes = curso.tiene_clase ? ["Clase", ...practicos] : practicos;
  return curso.tiene_clase ? partes.join(" + ") : `Solo ${partes.join(" + ")}`;
}

export function agregarCurso(codigo: string) {
  E.seleccion.push(codigo);
  E.manuales.add(codigo);
  E.excluidos.delete(codigo);
  guardarLocal();
  touch();
  pedirRestricciones();
}

export function quitarCurso(codigo: string) {
  E.seleccion = E.seleccion.filter((c) => c !== codigo);
  E.excluidos.add(codigo);
  E.manuales.delete(codigo);
  delete E.restringidas[codigo];
  guardarLocal();
  touch();
}

export function alternarRestringida(codigo: string, seccion: string, marcada: boolean) {
  const set = E.restringidas[codigo] ?? (E.restringidas[codigo] = new Set());
  if (marcada) set.add(seccion);
  else set.delete(seccion);
  E.overrides.add(`${codigo}|${seccion}`);
  guardarLocal();
  touch();
}

/* ---------- restricciones automáticas por carnet ----------
 * El endpoint devuelve las reglas CRUDAS (cacheables en CDN); la evaluación
 * contra carnet/carrera pasa acá, en el navegador de cada estudiante. */

export const pedirRestricciones = debounce(async () => {
  const params = E.catalogo?.restricciones_params;
  if (!E.catalogo || !params) return;
  const pendientes: Array<{ codigo: string; seccion: string }> = [];
  for (const cod of E.seleccion) {
    const c = E.porCodigo.get(cod);
    if (!c) continue;
    const vistas = new Set<string>();
    for (const s of c.secciones) {
      if (s.restringida && !vistas.has(s.seccion)) {
        vistas.add(s.seccion);
        pendientes.push({ codigo: cod, seccion: s.seccion });
      }
    }
  }
  if (!pendientes.length) return;
  try {
    const respuestas = await Promise.all(pendientes.map(async ({ codigo, seccion }) => {
      const q = new URLSearchParams({
        codigo, seccion, anio: params.anio, periodo: params.periodo,
      });
      const r = await fetch(`/api/restricciones?${q}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      return { codigo, seccion, reglas: data.reglas as string[] };
    }));
    const carrera = normalizar(E.carrera).toUpperCase();
    E.restric = {};
    for (const { codigo, seccion, reglas } of respuestas) {
      (E.restric[codigo] ??= {})[seccion] = evaluarReglas(reglas, E.carnet, carrera);
    }
    aplicarVerdictos();
    guardarLocal();
    touch();
  } catch { /* sin red: quedan manuales, no es fatal */ }
}, 400);

function aplicarVerdictos() {
  for (const [cod, secs] of Object.entries(E.restric)) {
    if (!E.seleccion.includes(cod)) continue;
    const set = E.restringidas[cod] ?? (E.restringidas[cod] = new Set());
    for (const [sec, info] of Object.entries(secs)) {
      if (E.overrides.has(`${cod}|${sec}`)) continue;
      if (info.veredicto === "aplica") set.add(sec);
      else if (info.veredicto === "no_aplica") set.delete(sec);
    }
  }
}

/* ---------- bloqueos de tiempo ---------- */

export const claveSlot = (dia: string, min: number) => `${dia}|${min}`;

export function bloqueosComoRangos(): BloqueoRango[] {
  const rangos: BloqueoRango[] = [];
  for (const d of DIAS_ORDEN) {
    let abierto: { nivel: string; desde: number } | null = null;
    for (let min = GRID_INI; min <= GRID_FIN; min += SLOT_MIN) {
      const nivel = min < GRID_FIN ? E.bloqueos.get(claveSlot(d, min)) : undefined;
      if (abierto && nivel !== abierto.nivel) {
        rangos.push({ dia: d, inicio: aHHMM(abierto.desde), fin: aHHMM(min), nivel: abierto.nivel });
        abierto = null;
      }
      if (!abierto && nivel) abierto = { nivel, desde: min };
    }
  }
  return rangos;
}

export function bloqueosNivel(nivel: string) {
  return bloqueosComoRangos()
    .filter((b) => b.nivel === nivel)
    .map((b) => ({ dias: [b.dia], inicio: aMin(b.inicio), fin: aMin(b.fin) }));
}

export function pintarCelda(dia: string, min: number, pincel: string) {
  const clave = claveSlot(dia, min);
  if (pincel === "borrar") E.bloqueos.delete(clave);
  else E.bloqueos.set(clave, pincel as "imposible" | "evitar");
}

export function limpiarBloqueos() {
  E.bloqueos.clear();
  guardarLocal();
  touch();
}

/* ---------- generación (en el navegador) ---------- */

export async function generar(topN = E.topN) {
  if (!E.catalogo) return;
  cerrarMenuMovil();   // en móvil, que el resultado quede a la vista
  E.estadoGenerar = "Buscando todas las combinaciones sin traslapes…";
  touch();
  await new Promise((r) => setTimeout(r, 30));   // dejar pintar el estado
  try {
    const data = generarResultado({
      catalogo: E.catalogo,
      codigos: E.seleccion,
      restringidas: E.restringidas,
      bloqueos: bloqueosComoRangos(),
      topN,
    });
    E.resultado = data;
    E.topN = topN;
    if (!data.estrategias.some((e) => e.id === E.estrategia)) {
      E.estrategia = data.estrategias[0]?.id ?? null;
    }
    E.opcion = 0;
    E.editor = null;
    if (E.miHorario) {
      const ok = E.miHorario.codigos.length === data.cursos_incluidos.length &&
        E.miHorario.codigos.every((c) => data.cursos_incluidos.includes(c)) &&
        E.miHorario.codigos.every((c) => (data.opciones[c] ?? []).length > E.miHorario!.ids[c]);
      if (!ok) E.miHorario = null;
    }
    E.estadoGenerar = "";
    guardarLocal();
  } catch (e) {
    E.estadoGenerar = `Error: ${(e as Error).message}`;
  }
  touch();
}

/* ---------- vista de resultados ---------- */

export function estrategiaActiva() {
  return E.resultado?.estrategias.find((e) => e.id === E.estrategia) ?? null;
}

export interface CursoMostrado {
  codigo: string;
  nombre: string;
  opcion: OpcionJson;
  opcionId: number;
}

export function comboMostrado(): CursoMostrado[] | null {
  const res = E.resultado;
  if (!res) return null;
  if (E.editor) {
    return [...E.editor.ids.entries()].map(([codigo, id]) => ({
      codigo, nombre: E.porCodigo.get(codigo)?.nombre ?? codigo,
      opcion: res.opciones[codigo][id], opcionId: id,
    }));
  }
  if (E.opcion === "mia" && E.miHorario) {
    return E.miHorario.codigos.map((codigo) => ({
      codigo, nombre: E.porCodigo.get(codigo)?.nombre ?? codigo,
      opcion: res.opciones[codigo][E.miHorario!.ids[codigo]],
      opcionId: E.miHorario!.ids[codigo],
    }));
  }
  const combo = estrategiaActiva()?.combos[E.opcion as number];
  if (!combo) return null;
  return combo.cursos.map((c) => ({
    codigo: c.codigo, nombre: c.nombre,
    opcion: { componentes: c.componentes, etiqueta: c.etiqueta },
    opcionId: c.opcion_id,
  }));
}

export function metricasMostradas(combo: ComboJson | undefined) {
  if (!E.editor && E.opcion !== "mia" && combo) return combo.metrics;
  const mostrado = comboMostrado();
  if (!mostrado) return null;
  return metricasDeOpciones(mostrado.map((c) => c.opcion), bloqueosComoRangos());
}

export function elegirEstrategia(id: string) {
  salirEditor(false);
  E.estrategia = id;
  E.opcion = 0;
  guardarLocal();
  touch();
}

export function elegirOpcion(op: number | "mia") {
  salirEditor(false);
  E.opcion = op;
  guardarLocal();
  touch();
}

export function verMasOpciones() {
  generar(Math.min(E.topN + 7, 25));
}

export function quitarYRegenerar(codigo: string) {
  quitarCurso(codigo);
  generar();
}

/* ---------- editor ---------- */

export function entrarEditor() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  E.editor = {
    ids: new Map(mostrado.map((c) => [c.codigo, c.opcionId])),
    seleccionado: null,
    undo: [],
  };
  touch();
}

export function salirEditor(guardar = true) {
  if (!E.editor) return;
  if (guardar && E.editor.undo.length) {
    E.miHorario = {
      codigos: [...E.editor.ids.keys()],
      ids: Object.fromEntries(E.editor.ids),
    };
    E.opcion = "mia";
    guardarLocal();
  }
  E.editor = null;
  touch();
}

export function seleccionarEnEditor(codigo: string) {
  if (!E.editor) return;
  E.editor.seleccionado = E.editor.seleccionado === codigo ? null : codigo;
  touch();
}

function sesionesDeOpcionJson(op: OpcionJson) {
  return op.componentes.map((c) => ({ dias: c.dias, inicio: aMin(c.inicio), fin: aMin(c.fin) }));
}

type SesionLigera = { dias: string[]; inicio: number; fin: number };
function traslapan(a: SesionLigera, b: SesionLigera) {
  if (a.fin <= b.inicio || b.fin <= a.inicio) return false;
  return a.dias.some((d) => b.dias.includes(d));
}
function algunTraslape(sesiones: SesionLigera[], contra: SesionLigera[]) {
  return sesiones.some((s) => contra.some((c) => traslapan(s, c)));
}

/** Opciones alternativas de `codigo` que caben con el combo descrito por
 * `ids` (curso -> índice de opción) sin pisar bloqueos «imposible». La usan
 * el editor (ghosts) y el plan B del horario personalizado. */
export function opcionesQueCaben(codigo: string, ids: Map<string, number>) {
  const res = E.resultado!;
  const actualId = ids.get(codigo);
  const resto: SesionLigera[] = [];
  for (const [otro, id] of ids) {
    if (otro !== codigo) resto.push(...sesionesDeOpcionJson(res.opciones[otro][id]));
  }
  resto.push(...bloqueosNivel("imposible"));
  const out: Array<{ id: number; etiqueta: string; componentes: OpcionJson["componentes"] }> = [];
  (res.opciones[codigo] ?? []).forEach((op, i) => {
    if (i === actualId) return;
    if (!algunTraslape(sesionesDeOpcionJson(op), resto)) {
      out.push({ id: i, etiqueta: op.etiqueta, componentes: op.componentes });
    }
  });
  return out;
}

export function ghostsPara(codigo: string) {
  return opcionesQueCaben(codigo, E.editor!.ids);
}

/** Plan B del combo actualmente MOSTRADO (incluido «Mi horario»): mismos
 * datos que trae un combo rankeado, calculados al vuelo en el cliente. */
export function planBDelMostrado():
  { cursos: ComboJson["cursos"]; emergencia: ComboJson["emergencia"] } | null {
  const mostrado = comboMostrado();
  if (!mostrado || !E.resultado) return null;
  const ids = new Map(mostrado.map((c) => [c.codigo, c.opcionId]));
  return {
    cursos: mostrado.map((c) => ({
      codigo: c.codigo, nombre: c.nombre, opcion_id: c.opcionId,
      componentes: c.opcion.componentes, etiqueta: c.opcion.etiqueta,
    })),
    emergencia: Object.fromEntries(mostrado.map((c) => [
      c.codigo,
      opcionesQueCaben(c.codigo, ids).slice(0, 3)
        .map((g) => ({ componentes: g.componentes, etiqueta: g.etiqueta })),
    ])),
  };
}

export function aplicarSwap(codigo: string, nuevoId: number) {
  const ed = E.editor;
  if (!ed) return;
  ed.undo.push(new Map(ed.ids));
  ed.ids.set(codigo, nuevoId);
  ed.seleccionado = codigo;
  touch();
}

export function deshacerSwap() {
  const ed = E.editor;
  if (!ed || !ed.undo.length) return;
  ed.ids = ed.undo.pop()!;
  touch();
}

/* ---------- modales ---------- */

export function setModal(cual: "pensum" | "acerca" | "bienvenida" | "export" | "temas", abierto: boolean) {
  if (cual === "pensum") E.modalPensum = abierto;
  if (cual === "acerca") E.modalAcerca = abierto;
  if (cual === "bienvenida") E.modalBienvenida = abierto;
  if (cual === "export") E.menuExportar = abierto;
  if (cual === "temas") E.menuTemas = abierto;
  touch();
}

/* ---------- arranque ---------- */

export function iniciarApp() {
  cargarLocal();
  document.body.classList.toggle("sidebar-oculta", E.sidebarOculta);
  aplicarTema();
  cargarCatalogo(false);
  cargarIndicePensums();
  if (!localStorage.getItem("nhc_visto")) E.modalBienvenida = true;
  touch();
}
