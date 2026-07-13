/**
 * Validación pura (sin I/O) para el importador de grupos. Se testea aparte
 * y se reusa desde importar.mjs. Regla base: NADA entra al JSON si no calza
 * exactamente con una sección real del catálogo scrapeado, y todo link que
 * no sea un grupo de WhatsApp/Telegram canónico se rechaza.
 */

/* Los MISMOS regex que revalida el navegador (web/src/lib/cliente/grupos.ts).
 * Si cambiás uno, cambiá el otro. */
export const RE_WHATSAPP = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/;
export const RE_TELEGRAM = /^https:\/\/t\.me\/(\+[A-Za-z0-9_-]{5,40}|joinchat\/[A-Za-z0-9_-]{5,40}|[A-Za-z0-9_]{4,40})$/;

/** Quita parámetros de tracking (?s=cl&p=a…), fragmento y slash final. */
export function limpiarLink(url) {
  if (typeof url !== "string") return "";
  return url.trim().split(/[?#]/)[0].replace(/\/+$/, "");
}

/** Clasifica un link ya limpio, o null si no es un grupo permitido. */
export function clasificarLink(url) {
  const u = limpiarLink(url);
  if (RE_WHATSAPP.test(u)) return { tipo: "whatsapp", url: u };
  if (RE_TELEGRAM.test(u)) return { tipo: "telegram", url: u };
  return null;
}

/** Fracción de día de Excel (0.44→10:40) a "HH:MM". */
export function fraccionAHHMM(f) {
  const num = typeof f === "number" ? f : parseFloat(f);
  if (!isFinite(num)) return null;
  const total = Math.round(num * 24 * 60);
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Normaliza texto para comparar (sin tildes, mayúsculas, espacios colapsados). */
export function norm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/\s+/g, " ").trim();
}

/** Conjunto de días desde "LU MI VI" (o separados por coma). */
export function diasSet(s) {
  return new Set(norm(s).split(/[\s,]+/).filter(Boolean));
}
const mismosDias = (a, b) => a.size === b.size && [...a].every((d) => b.has(d));

/** Índice del catálogo por código para búsquedas O(1). */
export function indexarCatalogo(catalogo) {
  const idx = new Map();
  for (const c of catalogo.cursos || []) idx.set(c.codigo, c);
  return idx;
}

/**
 * Valida UNA fila (curso+sección+horario) contra el catálogo. Devuelve
 * `{ codigo, seccion, whatsapp?, telegram? }` si todo calza, o
 * `{ error }` con el motivo exacto. `fila` viene de lib-xlsx.
 */
export function validarFila(fila, idx) {
  const A = fila.celdas.A || "";
  const mCod = A.match(/^\s*(\d{3,4})\b/);
  if (!mCod) return { error: `columna A sin código de curso: «${A}»` };
  const codigo = mCod[1].padStart(4, "0");
  const nombreExcel = A.slice(mCod.index + mCod[1].length);
  const seccion = String(fila.celdas.B || "").trim();
  if (!seccion) return { error: `${codigo}: fila sin sección (columna B)` };

  const curso = idx.get(codigo);
  if (!curso) return { error: `${codigo}: no existe en el catálogo de este periodo` };
  if (norm(nombreExcel) !== norm(curso.nombre)) {
    return { error: `${codigo}: el nombre «${nombreExcel.trim()}» no coincide con «${curso.nombre}»` };
  }

  const inicio = fraccionAHHMM(fila.celdas.D);
  const fin = fraccionAHHMM(fila.celdas.E);
  const dias = diasSet(fila.celdas.F);
  const prof = norm(fila.celdas.G);

  // Debe existir una sección real con esa letra Y ese mismo horario.
  const cand = (curso.secciones || []).filter((s) => norm(s.seccion) === norm(seccion));
  if (!cand.length) return { error: `${codigo} sec ${seccion}: esa sección no existe en el catálogo` };
  const calza = cand.find((s) =>
    s.inicio === inicio && s.fin === fin && mismosDias(diasSet((s.dias || []).join(" ")), dias));
  if (!calza) {
    return { error: `${codigo} sec ${seccion}: el horario ${inicio}–${fin} ${[...dias].join(" ")} no coincide con el catálogo` };
  }
  if (prof && norm(calza.catedratico) && prof !== norm(calza.catedratico)) {
    return { error: `${codigo} sec ${seccion}: el catedrático no coincide («${fila.celdas.G}» vs «${calza.catedratico}»)` };
  }

  // Links: pueden venir como hipervínculo (links.J/K) o como texto plano.
  const crudos = [
    fila.links.J, fila.celdas.J, fila.links.K, fila.celdas.K,
  ].filter(Boolean);
  const grupo = {};
  for (const raw of crudos) {
    const cls = clasificarLink(raw);
    if (!cls) {
      // Un texto que no es link (ej. "PENDIENTE") no es error; pero un link
      // de otro dominio SÍ lo es (no queremos colar dominios raros).
      if (/^https?:\/\//i.test(raw)) {
        return { error: `${codigo} sec ${seccion}: link no permitido «${raw}» (solo WhatsApp o Telegram)` };
      }
      continue;
    }
    if (cls.tipo === "whatsapp" && !grupo.whatsapp) grupo.whatsapp = cls.url;
    if (cls.tipo === "telegram" && !grupo.telegram) grupo.telegram = cls.url;
  }
  if (!grupo.whatsapp && !grupo.telegram) return { error: null }; // fila sin grupo: se ignora

  return { codigo, seccion, ...grupo };
}

/**
 * Valida todas las filas y arma el objeto `grupos` ordenado. Devuelve
 * `{ grupos, aceptadas, errores }`. No lanza: junta TODOS los errores.
 */
export function validarArchivo(filas, catalogo) {
  const idx = indexarCatalogo(catalogo);
  const grupos = {};
  const errores = [];
  let aceptadas = 0;
  const urlish = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
  for (const fila of filas) {
    // Solo validamos filas con un link DE VERDAD (hipervínculo o texto http).
    // Así se saltan el encabezado y las ~3200 filas sin grupo del Excel.
    const tieneLink = fila.links.J || fila.links.K || urlish(fila.celdas.J) || urlish(fila.celdas.K);
    if (!tieneLink) continue;
    const r = validarFila(fila, idx);
    if (r.error) { errores.push(`fila ${fila.n}: ${r.error}`); continue; }
    if (r.error === null) continue; // link vacío/no-link, ignorada en silencio
    (grupos[r.codigo] ??= {});
    if (grupos[r.codigo][r.seccion]) {
      errores.push(`fila ${fila.n}: ${r.codigo} sec ${r.seccion} duplicada`);
      continue;
    }
    const g = {};
    if (r.whatsapp) g.whatsapp = r.whatsapp;
    if (r.telegram) g.telegram = r.telegram;
    grupos[r.codigo][r.seccion] = g;
    aceptadas++;
  }
  return { grupos: ordenar(grupos), aceptadas, errores };
}

/** Orden determinista (códigos y secciones) para que los diffs de PR sean limpios. */
function ordenar(grupos) {
  const out = {};
  for (const cod of Object.keys(grupos).sort()) {
    out[cod] = {};
    for (const sec of Object.keys(grupos[cod]).sort()) out[cod][sec] = grupos[cod][sec];
  }
  return out;
}
