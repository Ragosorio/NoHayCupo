/** Compartir horario con amigos — sin cuentas ni backend: TODO viaja en la
 * URL (fragmento #amigo=base64url(JSON)). El que recibe el link ve los cursos
 * y secciones del que invita, arma su propia versión, y las clases donde
 * eligen la misma sección se marcan como coincidencia. */
import { comboMostrado, toast } from "./acciones";
import { E, guardarLocal, touch } from "./estado";

export interface Invitacion {
  v: 1;
  de: string;
  semestre: string;
  /** codigo → componentes elegidos (categoría + sección). */
  secciones: Record<string, Array<{ cat: string; sec: string }>>;
}

const aB64url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

export function urlDeInvitacion(apodo: string): string | null {
  const mostrado = comboMostrado();
  if (!mostrado) return null;
  const inv: Invitacion = {
    v: 1,
    de: apodo.trim().slice(0, 24) || "Alguien",
    semestre: E.semestre,
    secciones: Object.fromEntries(mostrado.map((c) => [
      c.codigo,
      c.opcion.componentes.map((k) => ({ cat: k.categoria, sec: k.seccion })),
    ])),
  };
  return `${location.origin}/#amigo=${aB64url(JSON.stringify(inv))}`;
}

export async function compartirHorario(apodo: string) {
  const url = urlDeInvitacion(apodo);
  if (!url) { toast("Generá un horario primero"); return; }
  const de = apodo.trim() || "Alguien";
  const texto = `${de} te compartió su horario de FIUSAC en NoHayCupo.\n`
    + `Abrí el link: vas a ver sus cursos y secciones, armás tu propia versión, `
    + `y la app les marca en qué clases coinciden.\n${url}`;
  E.modalCompartir = false;
  if (navigator.share) {
    try { await navigator.share({ text: texto }); touch(); return; }
    catch { /* canceló el share nativo: cae al portapapeles */ }
  }
  try {
    await navigator.clipboard.writeText(texto);
    toast("Invitación copiada — pegala en el chat con tus amigos");
  } catch {
    toast("No se pudo copiar; copiá la URL de la barra");
  }
  touch();
}

/** Se llama al arrancar: si la URL trae #amigo=, importa la invitación,
 * reemplaza la selección de cursos y deja programada la auto-generación. */
export function leerInvitacionDeUrl() {
  const m = location.hash.match(/amigo=([^&]+)/);
  if (!m) return;
  try {
    const inv = JSON.parse(deB64url(m[1])) as Invitacion;
    if (!inv || typeof inv.secciones !== "object") return;
    const codigos = Object.keys(inv.secciones).slice(0, 15);
    if (!codigos.length) return;
    E.amigo = { de: String(inv.de || "Alguien").slice(0, 24), secciones: inv.secciones };
    if (inv.semestre) E.semestre = String(inv.semestre);
    E.seleccion = codigos;
    E.manuales = new Set(codigos);
    E.excluidos.clear();
    E.miHorario = null;
    E.vista = { generado: true, estrategia: null, opcion: 0 };   // auto-generar al cargar
    guardarLocal();
    toast(`${E.amigo.de} te compartió su horario — generando…`);
  } catch { /* URL rota: seguir como visita normal */ }
  history.replaceState(null, "", location.pathname + location.search);
}

/** ¿Este componente (curso+categoría+sección) coincide con lo que eligió el
 * amigo? Lo usa el calendario para marcar las clases compartidas. */
export function coincideConAmigo(codigo: string, categoria: string, seccion: string) {
  return !!E.amigo?.secciones[codigo]?.some((c) => c.cat === categoria && c.sec === seccion);
}

/** Resumen de coincidencias del combo mostrado contra el horario del amigo:
 * cursos donde eligieron exactamente las mismas secciones. */
export function coincidenciasConAmigo() {
  const mostrado = comboMostrado();
  if (!E.amigo || !mostrado) return null;
  const comunes = mostrado.filter((c) => E.amigo!.secciones[c.codigo]);
  const iguales = comunes.filter((c) =>
    c.opcion.componentes.every((k) => coincideConAmigo(c.codigo, k.categoria, k.seccion)));
  return { de: E.amigo.de, iguales: iguales.length, comunes: comunes.length };
}

export function quitarAmigo() {
  E.amigo = null;
  guardarLocal();
  touch();
}
