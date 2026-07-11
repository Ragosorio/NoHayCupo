/* ===== NoHayCupo — lógica del frontend ===== */
"use strict";

const $ = (sel) => document.querySelector(sel);

const DIAS_ORDEN = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];
const DIAS_NOMBRE = { LU: "Lunes", MA: "Martes", MI: "Miércoles", JU: "Jueves", VI: "Viernes", SA: "Sábado", DO: "Domingo" };
const DIAS_CORTO = { LU: "L", MA: "M", MI: "X", JU: "J", VI: "V", SA: "S", DO: "D" };

// Rejilla de bloqueos: celdas de 30 min, de 06:30 a 21:30 (cubre todo el catálogo)
const SLOT_MIN = 30;
const GRID_INI = 6 * 60 + 30;
const GRID_FIN = 21 * 60 + 30;
const DIAS_GRID = DIAS_ORDEN;

/* Paletas por curso [fondo, borde, tinta] — validadas con el validador de
   dataviz (banda de luminosidad, separación CVD y contraste) en ambos temas. */
const PALETA_CLARA = [
  ["#eef0fe", "#4f46e5", "#312e81"],
  ["#e6f6f4", "#0d9488", "#134e4a"],
  ["#fdf1e2", "#d97706", "#713f12"],
  ["#fdeaef", "#db2777", "#831843"],
  ["#f0f7e8", "#65a30d", "#365314"],
  ["#e8f3fd", "#0284c7", "#0c4a6e"],
  ["#feeceb", "#dc2626", "#7f1d1d"],
  ["#f0ecfd", "#7c3aed", "#4c1d95"],
];
const PALETA_OSCURA = [
  ["#1d2140", "#6366f1", "#c7d2fe"],
  ["#12262c", "#0d9488", "#99f6e4"],
  ["#2a2214", "#d97706", "#fde68a"],
  ["#2b1a2b", "#ec4899", "#fbcfe8"],
  ["#1c2416", "#65a30d", "#d9f99d"],
  ["#122336", "#0284c7", "#bae6fd"],
  ["#2b181d", "#ef4444", "#fecaca"],
  ["#221d3d", "#8b5cf6", "#ddd6fe"],
];

const estado = {
  catalogo: null,
  porCodigo: new Map(),
  seleccion: [],
  manuales: new Set(),
  excluidos: new Set(),
  sync: false,
  restringidas: {},
  overrides: new Set(),
  restric: {},
  carnet: "",
  bloqueos: new Map(),      // "DIA|minInicioSlot" -> "imposible" | "evitar"
  pincel: "imposible",
  tema: null,               // "light" | "dark"
  sidebarOculta: false,
  topN: 3,
  resultado: null,          // respuesta de /api/generar
  estrategia: null,
  opcion: 0,                // índice de combo, o "mia" para el horario editado
  miHorario: null,          // {codigos: [...], ids: {codigo: opcionId}} — combo editado por el usuario
  pensum: null,
  pensumPorCodigo: new Map(),
  aprobados: new Set(),     // aprobados del pénsum ACTIVO
  aprobadosPor: {},         // {pensumId: [codigos]} — cada pénsum guarda los suyos
  indicePensums: [],        // data/pensums.json vía /api/pensums
  carrera: "Ingeniería en Ciencias y Sistemas",
  pensumId: null,
  editor: null,             // {ids: Map(codigo->opcionId), seleccionado, undo: []}
};

/* ---------- utilidades ---------- */

const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const aHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const escapar = (s) => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
const nombreBonito = (s) => s.toLowerCase().replace(/(^|[\s.·(-])\p{L}/gu, (c) => c.toUpperCase());

const paleta = () => (estado.tema === "dark" ? PALETA_OSCURA : PALETA_CLARA);
const colorDe = (codigo) => {
  const orden = estado.resultado?.cursos_incluidos?.length
    ? estado.resultado.cursos_incluidos : estado.seleccion;
  const i = orden.indexOf(codigo);
  return paleta()[(i < 0 ? 0 : i) % paleta().length];
};

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ---------- persistencia (localStorage: nada sale de tu navegador) ---------- */

function guardarLocal() {
  localStorage.setItem("nhc", JSON.stringify({
    semestre: $("#inputSemestre").value,
    seleccion: estado.seleccion,
    manuales: [...estado.manuales],
    excluidos: [...estado.excluidos],
    sync: estado.sync,
    restringidas: Object.fromEntries(Object.entries(estado.restringidas).map(([k, v]) => [k, [...v]])),
    overrides: [...estado.overrides],
    carnet: estado.carnet,
    carrera: estado.carrera,
    bloqueos: [...estado.bloqueos],
    aprobadosPor: {
      ...estado.aprobadosPor,
      ...(estado.pensumId != null ? { [estado.pensumId]: [...estado.aprobados] } : {}),
    },
    tema: estado.tema,
    sidebarOculta: estado.sidebarOculta,
    topN: estado.topN,
    miHorario: estado.miHorario,
  }));
}

function cargarLocal() {
  try {
    const d = JSON.parse(localStorage.getItem("nhc") || "{}");
    if (d.semestre) $("#inputSemestre").value = d.semestre;
    estado.seleccion = d.seleccion || [];
    estado.manuales = new Set(d.manuales || d.seleccion || []);
    estado.excluidos = new Set(d.excluidos || []);
    estado.sync = !!d.sync;
    estado.restringidas = {};
    for (const [k, v] of Object.entries(d.restringidas || {})) estado.restringidas[k] = new Set(v);
    estado.overrides = new Set(d.overrides || []);
    estado.carnet = d.carnet || "";
    estado.carrera = d.carrera || "Ingeniería en Ciencias y Sistemas";
    estado.bloqueos = new Map(d.bloqueos || []);
    estado.aprobadosPor = d.aprobadosPor || {};
    // migración: versiones viejas guardaban un solo set (pénsum 28, sistemas)
    if (d.aprobados && !d.aprobadosPor) estado.aprobadosPor = { 28: d.aprobados };
    estado.tema = d.tema || null;
    estado.sidebarOculta = !!d.sidebarOculta;
    estado.topN = d.topN || 3;
    estado.miHorario = d.miHorario || null;
  } catch { /* localStorage corrupto: empezar de cero */ }
  $("#chkSync").checked = estado.sync;
  $("#inputCarnet").value = estado.carnet;
  document.body.classList.toggle("sidebar-oculta", estado.sidebarOculta);
}

/* ---------- toast ---------- */

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- tema claro/oscuro ---------- */

function aplicarTema() {
  if (!estado.tema) {
    estado.tema = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = estado.tema;
  $("#btnTema").textContent = estado.tema === "dark" ? "☀" : "◐";
  $("#btnTema").title = estado.tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
}

function alternarTema() {
  estado.tema = estado.tema === "dark" ? "light" : "dark";
  aplicarTema();
  guardarLocal();
  renderSeleccion();
  if (estado.resultado) renderResultado();
}

/* ---------- catálogo ---------- */

async function cargarCatalogo(refresh = false) {
  const sem = $("#inputSemestre").value.trim() || "2";
  $("#estadoCatalogo").textContent = refresh ? "Descargando catálogo…" : "Cargando catálogo…";
  $("#inputBuscar").disabled = true;
  try {
    const r = await fetch(`/api/catalogo?semestre=${encodeURIComponent(sem)}&refresh=${refresh ? 1 : 0}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    estado.catalogo = data;
    estado.porCodigo = new Map(data.cursos.map((c) => [c.codigo, c]));
    estado.seleccion = estado.seleccion.filter((c) => estado.porCodigo.has(c));
    $("#estadoCatalogo").textContent =
      `${data.total_cursos} cursos · ${data.desde_cache ? "caché " : ""}${data.actualizado}`;
    $("#inputBuscar").disabled = false;
    sincronizarConPensum();
    renderSeleccion();
    renderPensumPanel();
    pedirRestricciones();
  } catch (e) {
    $("#estadoCatalogo").textContent = `⚠ ${e.message}`;
  }
}

/* ---------- pénsum (red de estudios, multi-carrera) ---------- */

/* Año de cohorte del carnet: los primeros 4 dígitos (ej. 202600999 -> 2026). */
function anioCarnet() {
  const m = (estado.carnet || "").match(/^(20\d{2})/);
  return m ? Number(m[1]) : null;
}

/* Qué pénsum le toca al estudiante: de su carrera, el de vigencia más reciente
   que sea <= año del carnet; a igual vigencia, el id más alto (revisión más
   nueva). Sin carnet: el más reciente de la carrera. */
function pensumParaEstudiante() {
  const dePenCarrera = estado.indicePensums.filter((p) => p.carrera === estado.carrera);
  if (!dePenCarrera.length) return null;
  const anio = anioCarnet();
  const masNuevo = (lista) => lista.reduce((mejor, p) =>
    (p.vigencia_desde > mejor.vigencia_desde ||
     (p.vigencia_desde === mejor.vigencia_desde && p.id > mejor.id)) ? p : mejor);
  const candidatos = anio ? dePenCarrera.filter((p) => p.vigencia_desde <= anio) : dePenCarrera;
  if (candidatos.length) return masNuevo(candidatos);
  // carnet anterior a todos los pénsums publicados: el más viejo es el más cercano
  return dePenCarrera.reduce((mejor, p) =>
    (p.vigencia_desde < mejor.vigencia_desde ||
     (p.vigencia_desde === mejor.vigencia_desde && p.id > mejor.id)) ? p : mejor);
}

async function cargarIndicePensums() {
  try {
    const r = await fetch("/api/pensums");
    const data = await r.json();
    estado.indicePensums = data.pensums || [];
  } catch { estado.indicePensums = []; }
  const sel = $("#selCarrera");
  const carreras = [...new Set(estado.indicePensums.map((p) => p.carrera))].sort();
  sel.innerHTML = carreras.map((c) => `<option${c === estado.carrera ? " selected" : ""}>${escapar(c)}</option>`).join("");
  sel.disabled = carreras.length === 0;
  await elegirPensum();
}

/* Resuelve el pénsum según carrera+carnet y lo (re)carga si cambió. */
async function elegirPensum() {
  const meta = pensumParaEstudiante();
  if (!meta) { $("#pensumMeta").textContent = ""; return; }
  $("#pensumMeta").textContent =
    `${meta.plan} ${meta.vigencia_desde}${anioCarnet() ? " · según tu carnet" : ""}`;
  if (meta.id === estado.pensumId) return;
  // guardar los aprobados del pénsum que se va, cargar los del que viene
  if (estado.pensumId != null) estado.aprobadosPor[estado.pensumId] = [...estado.aprobados];
  estado.pensumId = meta.id;
  estado.aprobados = new Set(estado.aprobadosPor[meta.id] || []);
  await cargarPensum(meta.id);
}

async function cargarPensum(pensumId) {
  try {
    const r = await fetch(`/api/pensum?id=${pensumId}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    // si mientras descargaba el usuario cambió de carrera/carnet, descartar
    if (estado.pensumId !== pensumId) return;
    estado.pensum = data.cursos;
    estado.pensumPorCodigo = new Map(data.cursos.map((c) => [c.codigo, c]));
    $("#modalTitulo").textContent = `Mi pénsum — ${data.carrera}`;
    $("#modalSub").textContent =
      `${data.plan || ""} ${data.vigencia_desde || ""} · ${data.cursos.length} cursos · ${data.total_creditos} créditos · red de estudios ${data.desde_cache ? "en caché del" : "descargada el"} ${data.actualizado}`;
    $("#btnAbrirPensum").disabled = false;
    sincronizarConPensum();
    renderSeleccion();
    renderPensumPanel();
  } catch (e) {
    $("#pensumResumen").innerHTML = `<p class="hint">⚠ No se pudo cargar el pénsum: ${escapar(e.message)}</p>`;
  }
}

function cursosElegibles() {
  if (!estado.pensum) return [];
  return estado.pensum.filter((c) =>
    !estado.aprobados.has(c.codigo) &&
    c.prerrequisitos.every((p) => estado.aprobados.has(p)));
}

function creditosAprobados() {
  let total = 0;
  for (const cod of estado.aprobados) {
    const c = estado.pensumPorCodigo.get(cod);
    if (c) total += c.creditos || 0;
  }
  return total;
}

/* Sincronización pénsum -> lista (opt-in). Respeta manuales y excluidos. */
function sincronizarConPensum() {
  if (!estado.pensum || !estado.catalogo) return;
  const elegibles = new Set(cursosElegibles().map((c) => c.codigo));
  if (!estado.sync) {
    estado.seleccion = estado.seleccion.filter((cod) => !estado.aprobados.has(cod));
    return;
  }
  estado.seleccion = estado.seleccion.filter((cod) => {
    if (estado.aprobados.has(cod)) return false;
    if (estado.manuales.has(cod)) return true;
    if (!estado.pensumPorCodigo.has(cod)) return true;
    return elegibles.has(cod);
  });
  for (const c of cursosElegibles()) {
    if (estado.porCodigo.has(c.codigo) &&
        !estado.seleccion.includes(c.codigo) &&
        !estado.excluidos.has(c.codigo)) {
      estado.seleccion.push(c.codigo);
    }
  }
}

function renderPensumPanel() {
  if (!estado.pensum) return;
  const elegibles = cursosElegibles();
  const conOferta = elegibles.filter((c) => estado.porCodigo.has(c.codigo));
  const porAgregar = conOferta.filter((c) => !estado.seleccion.includes(c.codigo));

  $("#pensumResumen").innerHTML = `
    <div class="stats">
      <div class="stat-chip"><strong>${estado.aprobados.size}/${estado.pensum.length}</strong>aprobados</div>
      <div class="stat-chip"><strong>${creditosAprobados()}</strong>créditos</div>
      <div class="stat-chip"><strong>${elegibles.length}</strong>podés llevar</div>
    </div>
    ${estado.catalogo && elegibles.length !== conOferta.length
      ? `<p class="hint">${elegibles.length - conOferta.length} elegible(s) sin oferta este semestre.</p>` : ""}`;

  const btn = $("#btnAgregarElegibles");
  btn.hidden = estado.sync || porAgregar.length === 0;
  btn.className = "btn btn-elegibles";
  btn.textContent = `＋ Agregar los ${porAgregar.length} que podés llevar`;

  if (!$("#modalPensum").hidden) renderPensumModal();
}

function agregarElegibles() {
  const nuevos = cursosElegibles()
    .filter((c) => estado.porCodigo.has(c.codigo) && !estado.seleccion.includes(c.codigo))
    .map((c) => c.codigo);
  estado.seleccion.push(...nuevos);
  nuevos.forEach((cod) => estado.excluidos.delete(cod));
  renderSeleccion();
  renderPensumPanel();
  guardarLocal();
  pedirRestricciones();
}

const ORDINAL_SEM = ["", "Primer", "Segundo", "Tercer", "Cuarto", "Quinto",
                     "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];

function renderPensumModal() {
  const grid = $("#pensumGrid");
  grid.innerHTML = "";
  const elegibles = new Set(cursosElegibles().map((c) => c.codigo));

  $("#modalStats").innerHTML = `
    <div class="stat-chip"><strong>${estado.aprobados.size}/${estado.pensum.length}</strong>aprobados</div>
    <div class="stat-chip"><strong>${creditosAprobados()}</strong>créditos</div>
    <div class="stat-chip"><strong>${elegibles.size}</strong>podés llevar</div>`;

  for (let sem = 1; sem <= 10; sem++) {
    const cursos = estado.pensum.filter((c) => c.semestre === sem);
    if (!cursos.length) continue;
    const col = document.createElement("div");
    col.className = "pensum-col";
    col.innerHTML = `<div class="pensum-col-titulo"><span class="num">${sem}</span>${ORDINAL_SEM[sem]} semestre</div>`;

    for (const c of cursos) {
      const aprobado = estado.aprobados.has(c.codigo);
      const elegible = elegibles.has(c.codigo);
      const sinOferta = estado.catalogo && !estado.porCodigo.has(c.codigo);
      const faltantes = c.prerrequisitos.filter((p) => !estado.aprobados.has(p));

      const div = document.createElement("label");
      div.className = "pensum-curso"
        + (aprobado ? " aprobado" : elegible ? " elegible" : " bloqueado")
        + (sinOferta && !aprobado ? " sinoferta" : "");
      div.title = c.prerrequisitos.length
        ? `Prerrequisitos: ${c.prerrequisitos.join(", ")}` : "Sin prerrequisitos";
      div.innerHTML = `
        <input type="checkbox" ${aprobado ? "checked" : ""}>
        <div class="pc-info">
          <div class="pc-linea1">
            <span class="pc-codigo">${c.codigo}</span>
            <span class="pc-cred">${c.creditos} cr</span>
          </div>
          <div class="pc-nombre">${escapar(c.nombre)}</div>
          ${!aprobado && faltantes.length
            ? `<div class="pc-prereq">falta: ${faltantes.join(", ")}</div>` : ""}
        </div>`;
      div.querySelector("input").onchange = (ev) => {
        ev.target.checked ? estado.aprobados.add(c.codigo) : estado.aprobados.delete(c.codigo);
        sincronizarConPensum();
        guardarLocal();
        renderPensumPanel();
        renderPensumModal();
        renderSeleccion();
        pedirRestricciones();
      };
      col.appendChild(div);
    }
    grid.appendChild(col);
  }
}

/* ---------- buscador ---------- */

function buscar(q) {
  const nq = normalizar(q.trim());
  if (!nq || !estado.catalogo) return [];
  return estado.catalogo.cursos
    .filter((c) => !estado.seleccion.includes(c.codigo))
    .filter((c) => c.codigo.startsWith(nq) || normalizar(c.nombre).includes(nq))
    .slice(0, 12);
}

function etiquetaComponentes(curso) {
  const practicos = curso.componentes_practicos || [];
  if (!practicos.length) return null;
  const partes = curso.tiene_clase ? ["Clase", ...practicos] : practicos;
  return curso.tiene_clase ? partes.join(" + ") : `Solo ${partes.join(" + ")}`;
}

function renderBusqueda() {
  const ul = $("#listaResultados");
  const items = buscar($("#inputBuscar").value);
  ul.innerHTML = "";
  ul.hidden = items.length === 0;
  for (const c of items) {
    const li = document.createElement("li");
    const comps = etiquetaComponentes(c);
    li.innerHTML = `<span class="codigo">${c.codigo}</span>
      <span class="nombre">${escapar(nombreBonito(c.nombre))}</span>
      <span class="meta">${c.num_secciones} secc${comps ? ` · ${escapar(comps.toLowerCase())}` : ""}</span>`;
    li.onclick = () => agregarCurso(c.codigo);
    ul.appendChild(li);
  }
}

function agregarCurso(codigo) {
  estado.seleccion.push(codigo);
  estado.manuales.add(codigo);
  estado.excluidos.delete(codigo);
  $("#inputBuscar").value = "";
  $("#listaResultados").hidden = true;
  renderSeleccion();
  renderPensumPanel();
  guardarLocal();
  pedirRestricciones();
}

function quitarCurso(codigo) {
  estado.seleccion = estado.seleccion.filter((c) => c !== codigo);
  estado.excluidos.add(codigo);
  estado.manuales.delete(codigo);
  delete estado.restringidas[codigo];
  renderSeleccion();
  renderPensumPanel();
  guardarLocal();
}

/* ---------- restricciones automáticas por carnet ---------- */

const pedirRestricciones = debounce(async () => {
  if (!estado.catalogo) return;
  const conRestr = estado.seleccion.filter((cod) => {
    const c = estado.porCodigo.get(cod);
    return c && c.secciones.some((s) => s.restringida);
  });
  if (!conRestr.length) return;
  try {
    const r = await fetch("/api/restricciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        semestre: $("#inputSemestre").value.trim() || "2",
        cursos: conRestr,
        carnet: estado.carnet,
        // sin tildes: el sitio de la facultad escribe "INGENIERIA" sin acento
        carrera: normalizar(estado.carrera).toUpperCase(),
      }),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    estado.restric = data.resultados || {};
    aplicarVerdictos();
    renderSeleccion();
    guardarLocal();
  } catch { /* sin red: quedan manuales, no es fatal */ }
}, 400);

function aplicarVerdictos() {
  for (const [cod, secs] of Object.entries(estado.restric)) {
    if (!estado.seleccion.includes(cod)) continue;
    const set = estado.restringidas[cod] || (estado.restringidas[cod] = new Set());
    for (const [sec, info] of Object.entries(secs)) {
      if (estado.overrides.has(`${cod}|${sec}`)) continue;
      if (info.veredicto === "aplica") set.add(sec);
      else if (info.veredicto === "no_aplica") set.delete(sec);
    }
  }
}

/* ---------- selección + secciones restringidas ---------- */

const ICONO_VEREDICTO = { aplica: "✓", no_aplica: "✗", revisar: "?" };

function renderSeleccion() {
  const ul = $("#listaSeleccionados");
  ul.innerHTML = "";
  $("#hintVacio").hidden = estado.seleccion.length > 0;
  $("#btnGenerar").disabled = estado.seleccion.length === 0;
  $("#contadorCursos").textContent = estado.seleccion.length || "";

  estado.seleccion.forEach((codigo, idx) => {
    const curso = estado.porCodigo.get(codigo);
    if (!curso) return;
    const [, borde] = paleta()[idx % paleta().length];
    const restringidas = curso.secciones.filter((s) => s.restringida);
    const marcadas = estado.restringidas[codigo] || new Set();
    const verdictos = estado.restric[codigo] || {};

    const li = document.createElement("li");
    li.className = "curso-chip";
    li.style.setProperty("--color", borde);

    const badges = [];
    const comps = etiquetaComponentes(curso);
    if (comps) {
      const n = (curso.tiene_clase ? 1 : 0) + curso.componentes_practicos.length;
      badges.push(`<span class="mini-badge dual" title="Este curso se inscribe como ${n} componentes con horarios separados. La app garantiza que no choquen entre sí ni con el resto.">${escapar(comps)} · ${n} horarios</span>`);
    }
    if (restringidas.length) {
      badges.push(`<span class="mini-badge warn">${restringidas.length} restringidas</span>`);
    }
    const enPensum = estado.pensumPorCodigo.get(codigo);
    if (enPensum) {
      const faltan = enPensum.prerrequisitos.filter((p) => !estado.aprobados.has(p));
      if (faltan.length) {
        badges.push(`<span class="mini-badge warn" title="Según la red de estudios te falta aprobar: ${faltan.join(", ")}">⚠ falta prerreq. ${faltan.join(", ")}</span>`);
      }
    }

    li.innerHTML = `
      <div class="curso-chip-fila">
        <span class="codigo">${curso.codigo}</span>
        <span class="nombre">${escapar(nombreBonito(curso.nombre))}</span>
        <button class="quitar" title="Quitar curso">×</button>
      </div>
      ${badges.length ? `<div class="badges">${badges.join("")}</div>` : ""}`;

    if (restringidas.length) {
      const det = document.createElement("details");
      det.className = "restringidas-det";
      const resumen = () => {
        const set = estado.restringidas[codigo] || new Set();
        return `Secciones «Ver Restricciones» — ${set.size}/${restringidas.length} habilitadas`;
      };
      det.innerHTML = `<summary>${resumen()}</summary>`;
      const cont = document.createElement("div");
      cont.className = "lista-restr";
      if (!estado.carnet) {
        cont.innerHTML = `<p class="hint sin-margen">Escribí tu carnet arriba y estas se verifican solas. También podés marcarlas a mano.</p>`;
      }
      for (const s of restringidas) {
        const info = verdictos[s.seccion];
        const lbl = document.createElement("label");
        lbl.className = "restr-item" + (info ? ` v-${info.veredicto}` : "");
        const cat = s.categoria ? ` · ${s.categoria}` : "";
        const icono = info ? `<span class="restr-icono" title="${escapar(info.detalle.join("\n"))}">${ICONO_VEREDICTO[info.veredicto]}</span>` : "";
        lbl.innerHTML = `<input type="checkbox" ${marcadas.has(s.seccion) ? "checked" : ""}>
          ${icono}
          <span class="restr-texto"><span class="sec">${escapar(s.seccion)}</span>${cat} — ${s.dias.join(" ")} ${s.inicio}–${s.fin} · ${escapar(nombreBonito(s.catedratico))}
          ${info && info.veredicto !== "aplica" ? `<span class="restr-detalle">${escapar(info.detalle.join(" · "))}</span>` : ""}</span>`;
        lbl.querySelector("input").onchange = (ev) => {
          const set = estado.restringidas[codigo] || (estado.restringidas[codigo] = new Set());
          ev.target.checked ? set.add(s.seccion) : set.delete(s.seccion);
          estado.overrides.add(`${codigo}|${s.seccion}`);
          det.querySelector("summary").textContent = resumen();
          guardarLocal();
        };
        cont.appendChild(lbl);
      }
      det.appendChild(cont);
      li.appendChild(det);
    }

    li.querySelector(".quitar").onclick = () => quitarCurso(codigo);
    ul.appendChild(li);
  });
}

/* ---------- pintor de bloqueos de tiempo ---------- */

let pintando = null;
let ultimaCelda = null;

function claveSlot(dia, min) { return `${dia}|${min}`; }

function renderGridBloqueos() {
  const grid = $("#gridBloqueos");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `34px repeat(${DIAS_GRID.length}, 1fr)`;

  grid.appendChild(document.createElement("div"));
  for (const d of DIAS_GRID) {
    const h = document.createElement("div");
    h.className = "gb-head";
    h.textContent = DIAS_CORTO[d];
    h.title = DIAS_NOMBRE[d];
    grid.appendChild(h);
  }

  for (let min = GRID_INI; min < GRID_FIN; min += SLOT_MIN) {
    const esHora = min % 60 === 0;
    const lbl = document.createElement("div");
    lbl.className = "gb-hora";
    lbl.textContent = esHora ? aHHMM(min) : "";
    grid.appendChild(lbl);
    for (const d of DIAS_GRID) {
      const celda = document.createElement("div");
      const nivel = estado.bloqueos.get(claveSlot(d, min));
      celda.className = "gb-celda" + (nivel ? ` ${nivel}` : "");
      celda.dataset.dia = d;
      celda.dataset.min = min;
      grid.appendChild(celda);
    }
  }
  actualizarResumenBloqueos();
}

function aplicarPincel(celda) {
  const clave = claveSlot(celda.dataset.dia, Number(celda.dataset.min));
  if (pintando === "borrar") estado.bloqueos.delete(clave);
  else estado.bloqueos.set(clave, pintando);
  celda.classList.remove("imposible", "evitar");
  if (pintando !== "borrar") celda.classList.add(pintando);
}

/* Pinta el rectángulo entre la última celda y la actual — un arrastre rápido
   dispara pointerover salteándose celdas y dejaría huecos. */
function pintarHasta(celda) {
  const dia = celda.dataset.dia, min = Number(celda.dataset.min);
  if (ultimaCelda) {
    const [d0, d1] = [DIAS_GRID.indexOf(ultimaCelda.dia), DIAS_GRID.indexOf(dia)].sort((a, b) => a - b);
    const [m0, m1] = [ultimaCelda.min, min].sort((a, b) => a - b);
    for (let di = d0; di <= d1; di++) {
      for (let m = m0; m <= m1; m += SLOT_MIN) {
        const c = document.querySelector(`.gb-celda[data-dia="${DIAS_GRID[di]}"][data-min="${m}"]`);
        if (c) aplicarPincel(c);
      }
    }
  } else {
    aplicarPincel(celda);
  }
  ultimaCelda = { dia, min };
}

function actualizarResumenBloqueos() {
  let imp = 0, evi = 0;
  for (const nivel of estado.bloqueos.values()) (nivel === "imposible" ? imp++ : evi++);
  const h = (n) => (n * SLOT_MIN / 60).toFixed(1).replace(".0", "");
  const partes = [];
  if (imp) partes.push(`${h(imp)} h imposibles`);
  if (evi) partes.push(`${h(evi)} h «mejor no»`);
  $("#resumenBloqueos").textContent = partes.length
    ? partes.join(" · ") + " /semana"
    : "Pintá arrastrando. Sin bloqueos, se usa cualquier hora.";
  $("#btnLimpiarBloqueos").hidden = estado.bloqueos.size === 0;
}

function bloqueosComoRangos() {
  const rangos = [];
  for (const d of DIAS_GRID) {
    let abierto = null;
    for (let min = GRID_INI; min <= GRID_FIN; min += SLOT_MIN) {
      const nivel = min < GRID_FIN ? estado.bloqueos.get(claveSlot(d, min)) : undefined;
      if (abierto && nivel !== abierto.nivel) {
        rangos.push({ dia: d, inicio: aHHMM(abierto.desde), fin: aHHMM(min), nivel: abierto.nivel });
        abierto = null;
      }
      if (!abierto && nivel) abierto = { nivel, desde: min };
    }
  }
  return rangos;
}

function initBloqueos() {
  renderGridBloqueos();
  const grid = $("#gridBloqueos");

  grid.addEventListener("pointerdown", (ev) => {
    const celda = ev.target.closest(".gb-celda");
    if (!celda) return;
    ev.preventDefault();
    const clave = claveSlot(celda.dataset.dia, Number(celda.dataset.min));
    const pincel = estado.pincel;
    pintando = (pincel !== "borrar" && estado.bloqueos.get(clave) === pincel) ? "borrar" : pincel;
    ultimaCelda = null;
    pintarHasta(celda);
  });
  grid.addEventListener("pointerover", (ev) => {
    if (!pintando) return;
    const celda = ev.target.closest(".gb-celda");
    if (celda) pintarHasta(celda);
  });
  document.addEventListener("pointerup", () => {
    if (!pintando) return;
    pintando = null;
    ultimaCelda = null;
    actualizarResumenBloqueos();
    guardarLocal();
  });

  $("#pinceles").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".pincel");
    if (!btn) return;
    estado.pincel = btn.dataset.nivel;
    document.querySelectorAll(".pincel").forEach((b) => b.classList.toggle("activa", b === btn));
  });

  $("#btnLimpiarBloqueos").addEventListener("click", () => {
    estado.bloqueos.clear();
    renderGridBloqueos();
    guardarLocal();
  });
}

/* ---------- motor cliente (para el editor): traslapes y métricas ---------- */

function sesionesDeOpcion(op) {
  return op.componentes.map((c) => ({ dias: c.dias, inicio: aMin(c.inicio), fin: aMin(c.fin) }));
}

function traslapan(a, b) {
  if (a.fin <= b.inicio || b.fin <= a.inicio) return false;
  return a.dias.some((d) => b.dias.includes(d));
}

function algunTraslape(sesiones, contra) {
  return sesiones.some((s) => contra.some((c) => traslapan(s, c)));
}

function bloqueosNivel(nivel) {
  return bloqueosComoRangos()
    .filter((b) => b.nivel === nivel)
    .map((b) => ({ dias: [b.dia], inicio: aMin(b.inicio), fin: aMin(b.fin) }));
}

/* Réplica de engine.strategies.compute_metrics para el combo editado. */
function metricasCliente(opciones) {
  const DIAS_LAB = ["LU", "MA", "MI", "JU", "VI"];
  const DIA_INI = 7 * 60, DIA_FIN = 19 * 60;
  const evitar = bloqueosNivel("evitar");
  const porDia = Object.fromEntries(DIAS_LAB.map((d) => [d, []]));
  let usaSabado = false, minutosEvitar = 0;

  for (const op of opciones) {
    for (const s of sesionesDeOpcion(op)) {
      for (const b of evitar) {
        const comunes = s.dias.filter((d) => b.dias.includes(d)).length;
        if (comunes) minutosEvitar += Math.max(0, Math.min(s.fin, b.fin) - Math.max(s.inicio, b.inicio)) * comunes;
      }
      for (const d of s.dias) {
        if (porDia[d]) porDia[d].push([s.inicio, s.fin]);
        else if (d === "SA") usaSabado = true;
      }
    }
  }
  const conClase = DIAS_LAB.filter((d) => porDia[d].length);
  const libres = DIAS_LAB.filter((d) => !porDia[d].length);
  const bloqueLibre = (d) => {
    const ocupado = [...porDia[d]].sort((a, b) => a[0] - b[0]);
    let cursor = DIA_INI, max = 0;
    for (const [ini, fin] of ocupado) {
      const i = Math.max(ini, DIA_INI), f = Math.min(fin, DIA_FIN);
      if (i > cursor) max = Math.max(max, i - cursor);
      cursor = Math.max(cursor, f);
    }
    if (cursor < DIA_FIN) max = Math.max(max, DIA_FIN - cursor);
    return porDia[d].length ? max : DIA_FIN - DIA_INI;
  };
  const totalEvitar = bloqueosNivel("evitar")
    .reduce((t, b) => t + (b.fin - b.inicio) * b.dias.length, 0);
  return {
    minutos_en_evitar: minutosEvitar,
    horas_en_evitar: Math.round(minutosEvitar / 60 * 10) / 10,
    minutos_evitar_totales: totalEvitar,
    dias_libres: libres,
    num_dias_con_clase: conClase.length,
    usa_sabado: usaSabado,
    min_bloque_libre_h: Math.round(Math.min(...DIAS_LAB.map(bloqueLibre)) / 60 * 10) / 10,
  };
}

/* ---------- generación ---------- */

async function generar(topN = estado.topN) {
  const btn = $("#btnGenerar");
  btn.disabled = true;
  $("#estadoGenerar").hidden = false;
  $("#estadoGenerar").textContent = "Buscando todas las combinaciones sin traslapes…";
  try {
    const r = await fetch("/api/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        semestre: $("#inputSemestre").value.trim() || "2",
        cursos: estado.seleccion,
        restringidas: Object.fromEntries(
          Object.entries(estado.restringidas).map(([k, v]) => [k, [...v]])),
        bloqueos: bloqueosComoRangos(),
        top_n: topN,
      }),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    estado.resultado = data;
    estado.topN = topN;
    if (!data.estrategias.some((e) => e.id === estado.estrategia)) {
      estado.estrategia = data.estrategias[0]?.id || null;
    }
    estado.opcion = 0;
    estado.editor = null;
    // si el horario editado ya no corresponde a estos cursos, descartarlo
    if (estado.miHorario) {
      const ok = estado.miHorario.codigos.length === data.cursos_incluidos.length &&
        estado.miHorario.codigos.every((c) => data.cursos_incluidos.includes(c)) &&
        estado.miHorario.codigos.every((c) => (data.opciones[c] || []).length > estado.miHorario.ids[c]);
      if (!ok) estado.miHorario = null;
    }
    $("#estadoGenerar").hidden = true;
    guardarLocal();
    renderResultado();
  } catch (e) {
    $("#estadoGenerar").textContent = `⚠ ${e.message}`;
  } finally {
    btn.disabled = estado.seleccion.length === 0;
  }
}

/* ---------- render de resultados ---------- */

function estrategiaActiva() {
  return estado.resultado.estrategias.find((e) => e.id === estado.estrategia);
}

/* El combo mostrado, como lista [{codigo, nombre, opcion, opcionId}] */
function comboMostrado() {
  const res = estado.resultado;
  if (estado.editor) {
    return [...estado.editor.ids.entries()].map(([codigo, id]) => ({
      codigo, nombre: estado.porCodigo.get(codigo)?.nombre || codigo,
      opcion: res.opciones[codigo][id], opcionId: id,
    }));
  }
  if (estado.opcion === "mia" && estado.miHorario) {
    return estado.miHorario.codigos.map((codigo) => ({
      codigo, nombre: estado.porCodigo.get(codigo)?.nombre || codigo,
      opcion: res.opciones[codigo][estado.miHorario.ids[codigo]],
      opcionId: estado.miHorario.ids[codigo],
    }));
  }
  const combo = estrategiaActiva()?.combos[estado.opcion];
  if (!combo) return null;
  return combo.cursos.map((c) => ({
    codigo: c.codigo, nombre: c.nombre,
    opcion: { componentes: c.componentes, etiqueta: c.etiqueta },
    opcionId: c.opcion_id,
  }));
}

function renderResultado() {
  const res = estado.resultado;
  $("#vacioHero").hidden = true;
  $("#resultados").hidden = false;

  const adv = $("#advertencias");
  if (res.advertencias.length) {
    adv.hidden = false;
    adv.innerHTML = `<div class="titulo">⚠ Cosas que debés saber</div>
      <ul>${res.advertencias.map((a) => `<li>${escapar(a)}</li>`).join("")}</ul>`;
  } else {
    adv.hidden = true;
  }

  renderSacrificios(res.sacrificios || []);

  $("#resumenTotal").textContent =
    res.total_validas > 0
      ? `${res.total_validas.toLocaleString("es")} combinaciones válidas`
      : "Sin combinaciones válidas";

  // tabs de estrategias
  const tabs = $("#tabsEstrategias");
  tabs.innerHTML = "";
  for (const e of res.estrategias) {
    const b = document.createElement("button");
    b.className = "tab" + (e.id === estado.estrategia && estado.opcion !== "mia" ? " activa" : "");
    b.innerHTML = `<span class="t-nombre">${escapar(e.nombre)}</span><span class="t-desc">${escapar(e.descripcion)}</span>`;
    b.onclick = () => { salirEditor(false); estado.estrategia = e.id; estado.opcion = 0; renderResultado(); };
    tabs.appendChild(b);
  }

  const est = estrategiaActiva();
  const combos = est ? est.combos : [];

  // pager: opciones de la estrategia + "Mi horario" si existe
  const pager = $("#pagerOpciones");
  pager.innerHTML = "";
  combos.forEach((_, i) => {
    const b = document.createElement("button");
    b.textContent = `Opción ${i + 1}`;
    b.className = i === estado.opcion ? "activa" : "";
    b.onclick = () => { salirEditor(false); estado.opcion = i; renderResultado(); };
    pager.appendChild(b);
  });
  if (estado.miHorario) {
    const b = document.createElement("button");
    b.textContent = "✎ Mi horario";
    b.className = "mia" + (estado.opcion === "mia" ? " activa" : "");
    b.title = "El horario que ajustaste a mano";
    b.onclick = () => { salirEditor(false); estado.opcion = "mia"; renderResultado(); };
    pager.appendChild(b);
  }
  $("#btnVerMas").hidden = !(combos.length && res.total_validas > combos.length && estado.topN < 25);

  const mostrado = comboMostrado();
  $("#barraEditor").hidden = !estado.editor;
  $("#btnEditar").hidden = !!estado.editor || !mostrado;
  $("#alternativas").hidden = true;

  if (!mostrado) {
    $("#chipsMetricas").innerHTML = "";
    $("#calendario").innerHTML = `<p class="hint" style="margin:8px">No hay ninguna combinación posible con esos cursos y bloqueos. Revisá las advertencias y sugerencias de arriba.</p>`;
    $("#planBCards").innerHTML = "";
    return;
  }

  // métricas: del servidor si es un combo rankeado; calculadas acá si es editado
  let metrics;
  if (!estado.editor && estado.opcion !== "mia") {
    metrics = combos[estado.opcion].metrics;
  } else {
    metrics = metricasCliente(mostrado.map((c) => c.opcion));
  }
  renderMetricas(metrics);
  renderCalendario(mostrado);
  if (estado.editor) {
    $("#planB").hidden = true;
    renderAlternativas();
  } else {
    $("#planB").hidden = estado.opcion === "mia";
    if (estado.opcion !== "mia") renderPlanB(combos[estado.opcion]);
  }
}

function renderSacrificios(sacrificios) {
  const cont = $("#sacrificios");
  if (!sacrificios.length) { cont.hidden = true; cont.innerHTML = ""; return; }
  cont.hidden = false;
  cont.innerHTML = `<div class="titulo">Si sacrificás un curso, esto se destraba:</div>`;
  const lista = document.createElement("div");
  lista.className = "sacrificios-lista";
  for (const s of sacrificios) {
    const fila = document.createElement("div");
    fila.className = "sacrificio";
    fila.innerHTML = `
      <span class="s-info"><strong>${s.codigo}</strong> ${escapar(nombreBonito(s.nombre))}
        <span class="s-n">→ ${s.combinaciones.toLocaleString("es")}${s.combinaciones >= 5000 ? "+" : ""} combinaciones sin él</span></span>
      <button class="btn btn-mini">Quitarlo y regenerar</button>`;
    fila.querySelector("button").onclick = () => { quitarCurso(s.codigo); generar(); };
    lista.appendChild(fila);
  }
  cont.appendChild(lista);
}

function renderMetricas(m) {
  const libres = m.dias_libres.length
    ? m.dias_libres.map((d) => DIAS_NOMBRE[d]).join(", ")
    : "ninguno";
  const chips = [];
  if (m.minutos_evitar_totales > 0) {
    const totalH = (m.minutos_evitar_totales / 60).toFixed(1).replace(".0", "");
    chips.push(`<div class="metrica ${m.minutos_en_evitar ? "metrica-alerta" : "metrica-ok"}"><strong>${m.horas_en_evitar} h</strong>usadas de tu zona «mejor no» (marcaste ${totalH} h)</div>`);
  }
  chips.push(`<div class="metrica"><strong>${libres}</strong>día(s) de semana sin clase</div>`);
  chips.push(`<div class="metrica"><strong>${m.num_dias_con_clase}</strong>días de semana con clase</div>`);
  chips.push(`<div class="metrica"><strong>${m.usa_sabado ? "Sí" : "No"}</strong>usa sábado</div>`);
  chips.push(`<div class="metrica"><strong>${m.min_bloque_libre_h} h</strong>bloque libre mínimo por día</div>`);
  $("#chipsMetricas").innerHTML = chips
    .map((c, i) => c.replace('class="metrica', `style="--i:${i}" class="metrica`)).join("");
}

/* Construye la lista de eventos {dia, inicio, fin, ...} del combo mostrado. */
function eventosDe(mostrado) {
  const eventos = [];
  for (const curso of mostrado) {
    const [fondo, borde, tinta] = colorDe(curso.codigo);
    for (const comp of curso.opcion.componentes) {
      for (const dia of comp.dias) {
        eventos.push({
          dia, inicio: aMin(comp.inicio), fin: aMin(comp.fin),
          codigo: curso.codigo, nombre: curso.nombre,
          seccion: comp.seccion, categoria: comp.categoria,
          catedratico: comp.catedratico, horas: `${comp.inicio}–${comp.fin}`,
          fondo, borde, tinta,
        });
      }
    }
  }
  return eventos;
}

function renderCalendario(mostrado) {
  const eventos = eventosDe(mostrado);
  const bloqueos = bloqueosComoRangos();
  const usados = new Set(eventos.map((e) => e.dia));

  // ghosts del editor: opciones alternativas del curso seleccionado que caben
  let ghosts = [];
  if (estado.editor?.seleccionado) {
    ghosts = ghostsPara(estado.editor.seleccionado);
    for (const g of ghosts) g.componentes.forEach((c) => c.dias.forEach((d) => usados.add(d)));
  }

  const dias = DIAS_ORDEN.filter((d, i) => i < 5 || usados.has(d));

  const minEv = Math.min(...eventos.map((e) => e.inicio), 7 * 60);
  const maxEv = Math.max(...eventos.map((e) => e.fin), 14 * 60);
  const horaIni = Math.floor(minEv / 60);
  const horaFin = Math.ceil(maxEv / 60);
  const pxPorMin = 1.05;
  const alto = (horaFin - horaIni) * 60 * pxPorMin;
  const y = (min) => (min - horaIni * 60) * pxPorMin;

  const grid = document.createElement("div");
  grid.className = "cal-grid";
  grid.style.gridTemplateColumns = `56px repeat(${dias.length}, 1fr)`;

  grid.appendChild(document.createElement("div"));
  for (const d of dias) {
    const h = document.createElement("div");
    h.className = "cal-head" + (usados.has(d) ? "" : " hoy-libre");
    h.textContent = DIAS_NOMBRE[d];
    grid.appendChild(h);
  }

  const colHoras = document.createElement("div");
  colHoras.style.position = "relative";
  colHoras.style.height = alto + "px";
  for (let h = horaIni; h <= horaFin; h++) {
    const lbl = document.createElement("div");
    lbl.className = "cal-hora";
    lbl.style.position = "absolute";
    lbl.style.top = y(h * 60) + "px";
    lbl.style.right = "0";
    lbl.textContent = `${String(h).padStart(2, "0")}:00`;
    colHoras.appendChild(lbl);
  }
  grid.appendChild(colHoras);

  for (const d of dias) {
    const col = document.createElement("div");
    col.className = "cal-col";
    col.style.height = alto + "px";

    for (let h = horaIni; h <= horaFin; h++) {
      const linea = document.createElement("div");
      linea.className = "cal-linea";
      linea.style.top = y(h * 60) + "px";
      col.appendChild(linea);
    }

    for (const b of bloqueos.filter((b) => b.dia === d)) {
      const ini = Math.max(aMin(b.inicio), horaIni * 60);
      const fin = Math.min(aMin(b.fin), horaFin * 60);
      if (fin <= ini) continue;
      const zona = document.createElement("div");
      zona.className = `cal-bloqueo ${b.nivel}`;
      zona.title = b.nivel === "imposible"
        ? `Bloqueo «imposible» ${b.inicio}–${b.fin}` : `Zona «mejor no» ${b.inicio}–${b.fin}`;
      zona.style.top = y(ini) + "px";
      zona.style.height = (fin - ini) * pxPorMin + "px";
      col.appendChild(zona);
    }

    const delDia = eventos.filter((e) => e.dia === d);
    if (!delDia.length && !ghosts.length) {
      const libre = document.createElement("div");
      libre.className = "cal-dia-libre";
      libre.textContent = "libre";
      col.appendChild(libre);
    }
    let orden = 0;
    for (const e of delDia) {
      const ev = document.createElement("div");
      const esLab = e.categoria !== "Clase";
      const sel = estado.editor?.seleccionado;
      ev.className = "evento" + (esLab ? " lab" : "")
        + (estado.editor ? " editable" : "")
        + (sel === e.codigo ? " seleccionado" : "")
        + (sel && sel !== e.codigo ? " atenuado" : "");
      ev.style.setProperty("--ev-fondo", e.fondo);
      ev.style.setProperty("--ev-borde", e.borde);
      ev.style.setProperty("--ev-tinta", e.tinta);
      ev.style.setProperty("--ev-raya", estado.tema === "dark" ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.72)");
      ev.style.setProperty("--i", orden++);
      ev.style.top = y(e.inicio) + "px";
      ev.style.height = Math.max(24, (e.fin - e.inicio) * pxPorMin - 3) + "px";
      ev.title = `${e.codigo} ${nombreBonito(e.nombre)}\n${e.categoria} ${e.seccion} · ${e.horas}\n${nombreBonito(e.catedratico)}`
        + (estado.editor ? "\n(clic para ver a dónde se puede mover)" : "");
      const tag = esLab ? `<span class="ev-tag">${e.categoria === "Laboratorio" ? "LAB" : e.categoria.slice(0, 5).toUpperCase()}</span>` : "";
      ev.innerHTML = `${tag}<div class="ev-curso">${e.codigo} · ${escapar(e.seccion)}</div>
        <div class="ev-detalle">${escapar(nombreBonito(e.nombre))}</div>
        <div class="ev-detalle">${e.horas}</div>`;
      if (estado.editor) {
        ev.onclick = () => {
          estado.editor.seleccionado = estado.editor.seleccionado === e.codigo ? null : e.codigo;
          renderResultado();
        };
      }
      col.appendChild(ev);
    }

    // ghosts: a dónde se puede mover el curso seleccionado
    for (const g of ghosts) {
      const [, borde] = colorDe(estado.editor.seleccionado);
      for (const comp of g.componentes) {
        if (!comp.dias.includes(d)) continue;
        const ini = aMin(comp.inicio), fin = aMin(comp.fin);
        const gh = document.createElement("div");
        gh.className = "ghost";
        gh.style.setProperty("--ev-borde", borde);
        gh.style.setProperty("--i", orden++);
        gh.style.top = y(ini) + "px";
        gh.style.height = Math.max(22, (fin - ini) * pxPorMin - 3) + "px";
        gh.title = `Mover acá:\n${g.etiqueta}`;
        gh.innerHTML = `→ ${escapar(comp.seccion)} <span style="opacity:.75">${comp.inicio}</span>`;
        gh.onclick = () => aplicarSwap(estado.editor.seleccionado, g.id);
        col.appendChild(gh);
      }
    }
    grid.appendChild(col);
  }

  const cal = $("#calendario");
  cal.innerHTML = "";
  cal.appendChild(grid);
}

function etiquetaOpcion(op) {
  return op.componentes
    .map((c) => `${c.categoria} ${c.seccion} (${c.dias.join(" ")} ${c.inicio}–${c.fin})`)
    .join(" + ");
}

function renderPlanB(combo) {
  const cont = $("#planBCards");
  cont.innerHTML = "";
  combo.cursos.forEach((curso, i) => {
    const [, borde] = colorDe(curso.codigo);
    const card = document.createElement("div");
    card.className = "planb-card";
    card.style.setProperty("--color", borde);
    card.style.setProperty("--i", i);

    let html = `<h3>${curso.codigo} · ${escapar(nombreBonito(curso.nombre))}</h3>
      <div class="sub">Elegida: ${escapar(etiquetaOpcion(curso))}</div>`;

    const equivalentes = curso.componentes.flatMap((c) =>
      c.equivalentes.map((eq) => ({ ...eq, categoria: c.categoria })));
    html += `<div class="grupo">Mismo horario, otro catedrático</div>`;
    html += equivalentes.length
      ? `<ul>${equivalentes.map((eq) =>
          `<li>${eq.categoria} <strong>${escapar(eq.seccion)}</strong> — ${escapar(nombreBonito(eq.catedratico))}</li>`).join("")}</ul>`
      : `<div class="nada">No hay — esta es la única sección con este horario.</div>`;

    const alts = (combo.emergencia[curso.codigo] || []);
    html += `<div class="grupo">Otro horario que también cabe</div>`;
    html += alts.length
      ? `<ul>${alts.map((a) => `<li class="etiqueta-alt">${escapar(etiquetaOpcion(a))}</li>`).join("")}</ul>`
      : `<div class="nada">Ninguno: si se llena, hay que rearmar el horario.</div>`;

    card.innerHTML = html;
    cont.appendChild(card);
  });
}

/* ---------- editor: ajustar el horario a mano ---------- */

function entrarEditor() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  estado.editor = {
    ids: new Map(mostrado.map((c) => [c.codigo, c.opcionId])),
    seleccionado: null,
    undo: [],
  };
  renderResultado();
}

function salirEditor(guardar = true) {
  if (!estado.editor) return;
  if (guardar && estado.editor.undo.length) {
    estado.miHorario = {
      codigos: [...estado.editor.ids.keys()],
      ids: Object.fromEntries(estado.editor.ids),
    };
    estado.opcion = "mia";
    guardarLocal();
  }
  estado.editor = null;
}

/* Opciones alternativas del curso que caben con el resto del combo actual
   y no pisan los bloqueos «imposible». */
function ghostsPara(codigo) {
  const res = estado.resultado;
  const actualId = estado.editor.ids.get(codigo);
  const resto = [];
  for (const [otro, id] of estado.editor.ids) {
    if (otro !== codigo) resto.push(...sesionesDeOpcion(res.opciones[otro][id]));
  }
  resto.push(...bloqueosNivel("imposible"));
  const out = [];
  (res.opciones[codigo] || []).forEach((op, i) => {
    if (i === actualId) return;
    if (!algunTraslape(sesionesDeOpcion(op), resto)) {
      out.push({ id: i, etiqueta: op.etiqueta, componentes: op.componentes });
    }
  });
  return out;
}

function aplicarSwap(codigo, nuevoId) {
  const ed = estado.editor;
  ed.undo.push(new Map(ed.ids));
  ed.ids.set(codigo, nuevoId);
  ed.seleccionado = codigo;
  $("#btnDeshacer").disabled = false;
  renderResultado();
}

function renderAlternativas() {
  const cont = $("#alternativas");
  const sel = estado.editor.seleccionado;
  $("#btnDeshacer").disabled = estado.editor.undo.length === 0;
  if (!sel) {
    cont.hidden = true;
    $("#msgEditor").textContent =
      "Modo edición — clic en un curso del calendario para ver a dónde se puede mover sin romper el resto.";
    return;
  }
  const res = estado.resultado;
  const nombre = estado.porCodigo.get(sel)?.nombre || sel;
  const actual = res.opciones[sel][estado.editor.ids.get(sel)];
  const alts = ghostsPara(sel);
  const [, borde] = colorDe(sel);
  $("#msgEditor").textContent =
    `${sel} · ${nombreBonito(nombre)} — ${alts.length} horario(s) alternativo(s) caben sin mover el resto.`;

  cont.hidden = false;
  cont.innerHTML = `<h3>${sel} · ${escapar(nombreBonito(nombre))}</h3>
    <p class="alt-sub">Elegí a dónde moverlo — solo se muestran horarios que no chocan con tus otros cursos ni con tus bloqueos. Los punteados en el calendario son lo mismo.</p>`;
  const lista = document.createElement("div");
  lista.className = "alt-lista";

  const cardActual = document.createElement("button");
  cardActual.className = "alt-item actual";
  cardActual.style.setProperty("--color", borde);
  cardActual.disabled = true;
  cardActual.innerHTML = `<span class="alt-et">${escapar(actual.etiqueta)}</span><span class="alt-nota">actual</span>`;
  lista.appendChild(cardActual);

  for (const g of alts) {
    const card = document.createElement("button");
    card.className = "alt-item";
    card.style.setProperty("--color", borde);
    const profe = g.componentes[0]?.catedratico;
    card.innerHTML = `<span class="alt-et">${escapar(g.etiqueta)}</span>
      ${profe ? `<span class="alt-nota">${escapar(nombreBonito(profe))}</span>` : ""}`;
    card.onclick = () => aplicarSwap(sel, g.id);
    lista.appendChild(card);
  }
  if (!alts.length) {
    const nada = document.createElement("div");
    nada.className = "alt-item actual";
    nada.textContent = "No hay otro horario de este curso que quepa sin mover los demás.";
    lista.appendChild(nada);
  }
  cont.appendChild(lista);
}

function deshacerSwap() {
  const ed = estado.editor;
  if (!ed || !ed.undo.length) return;
  ed.ids = ed.undo.pop();
  renderResultado();
}

/* ---------- exportar: PNG ---------- */

function exportarPng() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  const eventos = eventosDe(mostrado);
  const bloqueos = bloqueosComoRangos();
  const usados = new Set(eventos.map((e) => e.dia));
  const dias = DIAS_ORDEN.filter((d, i) => i < 5 || usados.has(d));

  const oscuro = estado.tema === "dark";
  const C = oscuro
    ? { fondo: "#0e1220", tarjeta: "#161b2b", linea: "#242c40", tinta: "#e8ebf4", suave: "#a2abbe" }
    : { fondo: "#ffffff", tarjeta: "#ffffff", linea: "#eceef2", tinta: "#191d2b", suave: "#616a7b" };

  const horaIni = Math.floor(Math.min(...eventos.map((e) => e.inicio), 7 * 60) / 60);
  const horaFin = Math.ceil(Math.max(...eventos.map((e) => e.fin), 14 * 60) / 60);
  const pxMin = 1.3, margenIzq = 64, margenTop = 76, anchoDia = 168, pad = 24;
  const W = margenIzq + dias.length * anchoDia + pad;
  const H = margenTop + (horaFin - horaIni) * 60 * pxMin + pad;
  const y = (min) => margenTop + (min - horaIni * 60) * pxMin;

  const canvas = document.createElement("canvas");
  const escala = 2;
  canvas.width = W * escala; canvas.height = H * escala;
  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);
  const F = "-apple-system, 'Segoe UI', Roboto, sans-serif";

  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = C.tinta;
  ctx.font = `800 17px ${F}`;
  ctx.fillText("Mi horario · NoHayCupo", pad, 34);
  ctx.fillStyle = C.suave;
  ctx.font = `12px ${F}`;
  ctx.fillText(`FIUSAC · semestre ${$("#inputSemestre").value.trim() || "?"} · ${mostrado.length} cursos`, pad, 52);

  dias.forEach((d, i) => {
    ctx.fillStyle = C.suave;
    ctx.font = `700 12px ${F}`;
    ctx.textAlign = "center";
    ctx.fillText(DIAS_NOMBRE[d], margenIzq + i * anchoDia + anchoDia / 2, margenTop - 10);
  });
  ctx.textAlign = "left";

  for (let h = horaIni; h <= horaFin; h++) {
    ctx.strokeStyle = C.linea;
    ctx.beginPath();
    ctx.moveTo(margenIzq, y(h * 60));
    ctx.lineTo(W - pad, y(h * 60));
    ctx.stroke();
    ctx.fillStyle = C.suave;
    ctx.font = `10px ${F}`;
    ctx.textAlign = "right";
    ctx.fillText(`${String(h).padStart(2, "0")}:00`, margenIzq - 8, y(h * 60) + 3);
    ctx.textAlign = "left";
  }

  // bloqueos
  for (const b of bloqueos) {
    const i = dias.indexOf(b.dia);
    if (i < 0) continue;
    const x = margenIzq + i * anchoDia;
    const yi = y(Math.max(aMin(b.inicio), horaIni * 60));
    const yf = y(Math.min(aMin(b.fin), horaFin * 60));
    if (yf <= yi) continue;
    ctx.fillStyle = b.nivel === "imposible" ? "rgba(229,72,77,.12)" : "rgba(226,183,92,.14)";
    ctx.fillRect(x + 1, yi, anchoDia - 2, yf - yi);
  }

  const rr = (x, yy, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, yy, w, h, r);
  };
  for (const e of eventos) {
    const i = dias.indexOf(e.dia);
    if (i < 0) continue;
    const x = margenIzq + i * anchoDia + 4;
    const w = anchoDia - 8;
    const yi = y(e.inicio), hf = Math.max(24, (e.fin - e.inicio) * pxMin - 3);
    ctx.fillStyle = e.fondo;
    rr(x, yi, w, hf, 7); ctx.fill();
    ctx.strokeStyle = e.borde; ctx.lineWidth = 1;
    rr(x, yi, w, hf, 7); ctx.stroke();
    ctx.fillStyle = e.borde;
    ctx.fillRect(x, yi + 1, 3.5, hf - 2);
    ctx.fillStyle = e.tinta;
    ctx.font = `800 11px ${F}`;
    ctx.fillText(`${e.codigo} · ${e.seccion}${e.categoria !== "Clase" ? " · " + e.categoria.toUpperCase() : ""}`, x + 9, yi + 14);
    ctx.font = `10px ${F}`;
    const nombre = nombreBonito(e.nombre);
    ctx.fillText(nombre.length > 26 ? nombre.slice(0, 25) + "…" : nombre, x + 9, yi + 27);
    if (hf > 38) ctx.fillText(e.horas, x + 9, yi + 40);
  }

  const a = document.createElement("a");
  a.download = "horario-nohaycupo.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

/* ---------- exportar: .ics (Google Calendar / Apple / Outlook) ---------- */

const ICS_DIA = { LU: "MO", MA: "TU", MI: "WE", JU: "TH", VI: "FR", SA: "SA", DO: "SU" };
const JS_DIA = { LU: 1, MA: 2, MI: 3, JU: 4, VI: 5, SA: 6, DO: 0 };

function exportarIcs() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  const lineas = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//NoHayCupo//Horarios FIUSAC//ES", "CALSCALE:GREGORIAN",
  ];
  const hoy = new Date();
  const fmt = (d, hhmm) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${hhmm.replace(":", "")}00`;
  let uid = 0;
  for (const curso of mostrado) {
    for (const comp of curso.opcion.componentes) {
      for (const dia of comp.dias) {
        // próxima fecha con ese día de semana
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + ((JS_DIA[dia] - hoy.getDay() + 7) % 7));
        const nombre = `${curso.codigo} ${nombreBonito(curso.nombre)}`
          + (comp.categoria !== "Clase" ? ` (${comp.categoria})` : "");
        lineas.push(
          "BEGIN:VEVENT",
          `UID:nhc-${Date.now()}-${uid++}@nohaycupo.local`,
          `DTSTART:${fmt(fecha, comp.inicio)}`,
          `DTEND:${fmt(fecha, comp.fin)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DIA[dia]};COUNT=18`,
          `SUMMARY:${nombre} · sec ${comp.seccion}`,
          `DESCRIPTION:${nombreBonito(comp.catedratico || "")}`,
          "END:VEVENT",
        );
      }
    }
  }
  lineas.push("END:VCALENDAR");
  const blob = new Blob([lineas.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.download = "horario-nohaycupo.ics";
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- exportar: prompt para IA ---------- */

function construirPromptIA() {
  const mostrado = comboMostrado();
  const L = [];
  L.push("# Ayudame a optimizar mi horario universitario (FIUSAC, USAC)");
  L.push("");
  L.push("Actuá como experto en armar horarios universitarios sin traslapes. Abajo te doy MIS cursos con TODAS sus secciones reales del catálogo, mis restricciones de tiempo y (si existe) el horario que estoy considerando.");
  L.push("");
  L.push("## Formato de los datos");
  L.push("Cada sección viene como: `SECCIÓN | COMPONENTE | DÍAS | HORARIO | CATEDRÁTICO | NOTA`");
  L.push("- COMPONENTE: si un curso tiene Clase y Laboratorio/Práctica, debo inscribir UNO de cada componente y no pueden traslaparse entre sí ni con otros cursos.");
  L.push("- DÍAS: LU MA MI JU VI SA DO. Dos clases se traslapan solo si comparten día Y sus rangos de hora se cruzan (tocarse en el minuto exacto NO es traslape).");
  L.push("- NOTA `restringida:no-me-aplica`: NO puedo inscribirla, descartala. `restringida:aplica`: sí puedo. `restringida:revisar`: solo si cumplo la condición indicada.");
  L.push("");

  // Bloqueos
  const rangos = bloqueosComoRangos();
  L.push("## Mis restricciones de tiempo");
  if (!rangos.length) {
    L.push("- Ninguna: cualquier hora sirve.");
  } else {
    for (const b of rangos.filter((r) => r.nivel === "imposible")) {
      L.push(`- IMPOSIBLE (jamás usar): ${DIAS_NOMBRE[b.dia]} ${b.inicio}–${b.fin}`);
    }
    for (const b of rangos.filter((r) => r.nivel === "evitar")) {
      L.push(`- MEJOR NO (usar lo mínimo posible): ${DIAS_NOMBRE[b.dia]} ${b.inicio}–${b.fin}`);
    }
  }
  L.push("");

  // Cursos con todas sus secciones
  L.push(`## Mis cursos (${estado.seleccion.length}) y todas sus secciones`);
  for (const codigo of estado.seleccion) {
    const curso = estado.porCodigo.get(codigo);
    if (!curso) continue;
    L.push("");
    L.push(`### ${codigo} · ${nombreBonito(curso.nombre)}`);
    const comps = etiquetaComponentes(curso);
    if (comps) L.push(`(Se inscribe como: ${comps} — un horario por componente)`);
    const marcadas = estado.restringidas[codigo] || new Set();
    const verdictos = estado.restric[codigo] || {};
    for (const s of curso.secciones) {
      if (!s.inicio || !s.dias.length) continue;
      let nota = "libre";
      if (s.restringida) {
        const v = verdictos[s.seccion];
        if (v?.veredicto === "no_aplica") nota = "restringida:no-me-aplica";
        else if (v?.veredicto === "aplica" || marcadas.has(s.seccion)) nota = "restringida:aplica";
        else if (v?.veredicto === "revisar") nota = `restringida:revisar (${v.detalle.join("; ")})`;
        else nota = "restringida:revisar";
      }
      L.push(`${s.seccion} | ${s.categoria || "Clase"} | ${s.dias.join(" ")} | ${s.inicio}–${s.fin} | ${nombreBonito(s.catedratico)} | ${nota}`);
    }
  }
  L.push("");

  // Horario actual
  if (mostrado) {
    L.push("## Horario que estoy considerando ahora");
    for (const c of mostrado) {
      L.push(`- ${c.codigo} ${nombreBonito(c.nombre)}: ${c.opcion.etiqueta}`);
    }
    L.push("");
  }

  L.push("## Qué te pido");
  L.push("1. Verificá que el horario que estoy considerando no tenga traslapes ni use secciones que no me aplican.");
  L.push("2. Proponé hasta 3 alternativas COMPLETAS (todos mis cursos) que: (a) no tengan traslapes, (b) nunca usen horas IMPOSIBLES, (c) minimicen las horas en zonas MEJOR NO, y (d) como desempate, dejen los huecos entre clases más cortos.");
  L.push("3. Presentá cada propuesta como tabla por día (LU–SA) con curso, sección, componente y horario, y explicá en una línea qué mejora respecto a mi horario actual.");
  L.push("4. Si algún curso no cabe de ninguna forma, decime cuál y qué lo bloquea.");
  L.push("");
  L.push("_Datos generados por NoHayCupo (github.com/Ragosorio/NoHayCupo) con el catálogo oficial de FIUSAC._");
  return L.join("\n");
}

async function exportarPrompt() {
  if (!estado.seleccion.length) { toast("Agregá cursos primero"); return; }
  const texto = construirPromptIA();
  try {
    await navigator.clipboard.writeText(texto);
    toast("Prompt copiado — pegalo en tu IA favorita 🤖");
  } catch {
    const blob = new Blob([texto], { type: "text/markdown" });
    const a = document.createElement("a");
    a.download = "prompt-horario-nohaycupo.md";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Prompt descargado como .md");
  }
}

/* ---------- tour guiado (driver.js) ---------- */

function iniciarTour() {
  const conResultados = !$("#resultados").hidden;
  const pasos = [
    { element: "#panelPerfil", popover: { title: "1 · Contale quién sos", description: "Elegí el semestre, abrí tu pénsum y marcá lo aprobado: la app sabe qué podés llevar. Con tu carnet, las secciones restringidas se verifican solas. Nada sale de tu navegador." } },
    { element: "#panelCursos", popover: { title: "2 · Tus cursos", description: "Buscá por código o nombre. Si un curso tiene laboratorio, se inscriben juntos y la app garantiza que no choquen." } },
    { element: "#panelTiempo", popover: { title: "3 · Tu tiempo", description: "Pintá arrastrando: «Imposible» = intocable (jamás se usa). «Mejor no» = se evita cuanto se pueda. Es opcional." } },
    { element: "#btnGenerar", popover: { title: "4 · Generar", description: "Se calculan TODAS las combinaciones sin traslapes y se rankean con 4 estrategias distintas." } },
  ];
  if (conResultados) {
    pasos.push(
      { element: "#tabsEstrategias", popover: { title: "Estrategias", description: "Cada pestaña ordena las mismas combinaciones con otra prioridad: salir temprano, entrar tarde, días libres o huecos parejos." } },
      { element: "#btnEditar", popover: { title: "Ajustar a mano", description: "¿Casi perfecto pero no exacto? Entrá al modo edición, tocá un curso y movelo a cualquier sección que quepa." } },
      { element: "#btnExportar", popover: { title: "Llevátelo", description: "Descargá tu horario como imagen, importalo a Google Calendar (.ics) o imprimilo." } },
    );
  } else {
    pasos.push({ element: "#vacioHero", popover: { title: "Y después de generar…", description: "Vas a poder comparar estrategias, ajustar el horario a mano moviendo cursos, y exportarlo a PNG o Google Calendar." } });
  }
  const d = window.driver.js.driver({
    showProgress: true,
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "¡Listo!",
    progressText: "{{current}} de {{total}}",
    steps: pasos,
  });
  d.drive();
}

/* ---------- eventos globales ---------- */

$("#inputBuscar").addEventListener("input", renderBusqueda);
$("#inputBuscar").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    const primero = $("#listaResultados li");
    if (primero) primero.click();
  }
  if (ev.key === "Escape") $("#listaResultados").hidden = true;
});
document.addEventListener("click", (ev) => {
  if (!ev.target.closest(".buscador")) $("#listaResultados").hidden = true;
  if (!ev.target.closest(".menu-export")) $("#menuExportar").hidden = true;
});
$("#btnGenerar").addEventListener("click", () => generar(3));
$("#btnVerMas").addEventListener("click", () => generar(Math.min(estado.topN + 7, 25)));
$("#btnActualizar").addEventListener("click", () => cargarCatalogo(true));
$("#inputSemestre").addEventListener("change", () => { guardarLocal(); cargarCatalogo(false); });

$("#btnTema").addEventListener("click", alternarTema);
$("#btnTourHero").addEventListener("click", iniciarTour);

// Panel lateral plegable
$("#btnMenu").addEventListener("click", () => {
  estado.sidebarOculta = !estado.sidebarOculta;
  document.body.classList.toggle("sidebar-oculta", estado.sidebarOculta);
  guardarLocal();
});

// "?" → Acerca de (autor + tour)
$("#btnAyuda").addEventListener("click", () => { $("#modalAcerca").hidden = false; });
$("#btnCerrarAcerca").addEventListener("click", () => { $("#modalAcerca").hidden = true; });
$("#modalAcerca").addEventListener("click", (ev) => {
  if (ev.target.id === "modalAcerca") $("#modalAcerca").hidden = true;
});
$("#btnTourAcerca").addEventListener("click", () => {
  $("#modalAcerca").hidden = true;
  iniciarTour();
});

$("#btnExportar").addEventListener("click", (ev) => {
  ev.stopPropagation();
  $("#menuExportar").hidden = !$("#menuExportar").hidden;
});
$("#btnPng").addEventListener("click", () => { $("#menuExportar").hidden = true; exportarPng(); toast("Imagen PNG descargada"); });
$("#btnIcs").addEventListener("click", () => { $("#menuExportar").hidden = true; exportarIcs(); toast("Archivo .ics descargado — importalo en Google Calendar"); });
$("#btnPrompt").addEventListener("click", () => { $("#menuExportar").hidden = true; exportarPrompt(); });
$("#btnImprimir").addEventListener("click", () => { $("#menuExportar").hidden = true; window.print(); });

$("#btnEditar").addEventListener("click", entrarEditor);
$("#btnSalirEditor").addEventListener("click", () => { salirEditor(true); renderResultado(); });
$("#btnDeshacer").addEventListener("click", deshacerSwap);

$("#chkSync").addEventListener("change", (ev) => {
  estado.sync = ev.target.checked;
  if (estado.sync) estado.excluidos.clear();
  sincronizarConPensum();
  renderSeleccion();
  renderPensumPanel();
  guardarLocal();
  pedirRestricciones();
});

$("#inputCarnet").addEventListener("input", (ev) => {
  estado.carnet = ev.target.value.trim();
  guardarLocal();
  pedirRestricciones();
  elegirPensum();   // el año del carnet puede cambiar el pénsum que aplica
});

$("#selCarrera").addEventListener("change", (ev) => {
  estado.carrera = ev.target.value;
  guardarLocal();
  elegirPensum();
  pedirRestricciones();   // las reglas de carrera cambian con la carrera
});

$("#btnAbrirPensum").addEventListener("click", () => {
  $("#modalPensum").hidden = false;
  renderPensumModal();
});
$("#btnCerrarPensum").addEventListener("click", () => { $("#modalPensum").hidden = true; });
$("#modalPensum").addEventListener("click", (ev) => {
  if (ev.target.id === "modalPensum") $("#modalPensum").hidden = true;
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    $("#modalPensum").hidden = true;
    $("#modalAcerca").hidden = true;
    $("#menuExportar").hidden = true;
  }
});
$("#btnAgregarElegibles").addEventListener("click", agregarElegibles);

// Bienvenida en la primera visita
$("#btnTourSi").addEventListener("click", () => {
  localStorage.setItem("nhc_visto", "1");
  $("#modalBienvenida").hidden = true;
  iniciarTour();
});
$("#btnTourNo").addEventListener("click", () => {
  localStorage.setItem("nhc_visto", "1");
  $("#modalBienvenida").hidden = true;
});

cargarLocal();
aplicarTema();
initBloqueos();
cargarCatalogo(false);
cargarIndicePensums();
if (!localStorage.getItem("nhc_visto")) $("#modalBienvenida").hidden = false;
