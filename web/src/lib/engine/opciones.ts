/** Construcción de opciones inscribibles por curso — puerto de engine/opciones.py.
 *
 * 1. Filtra restringidas no habilitadas (con advertencia, nunca en silencio).
 * 2. Agrupa secciones equivalentes por (inicio, fin, días).
 * 3. Producto cartesiano clase × CADA componente práctico, descartando
 *    combinaciones internas con traslape (la trampa clase-choca-con-todo-lab).
 *
 * El ORDEN de las opciones resultantes es contrato: los tests de paridad y el
 * editor referencian opciones por índice.
 */
import {
  COMPONENTE_CLASE, minToHHMM, tieneHorario,
  type Curso, type Opcion, type Seccion, type Sesion,
} from "./models";
import { sesionesSeTraslapan } from "./overlap";

/** Agrupa secciones por (inicio, fin, dias) idénticos, preservando el orden
 * de aparición (igual que el dict de Python). */
export function agruparPorHorario(secciones: Seccion[]): Seccion[][] {
  const grupos = new Map<string, Seccion[]>();
  for (const sec of secciones) {
    const clave = `${sec.inicio_min}|${sec.fin_min}|${sec.dias.join(",")}`;
    const g = grupos.get(clave);
    if (g) g.push(sec);
    else grupos.set(clave, [sec]);
  }
  return [...grupos.values()];
}

function filtrar(
  secciones: Seccion[], incluirRestringidas: Set<string>,
  advertencias: string[], curso: Curso, nombreComp: string,
): Seccion[] {
  const conHorario = secciones.filter(tieneHorario);
  if (conHorario.length < secciones.length) {
    advertencias.push(
      `${curso.codigo}: ${secciones.length - conHorario.length} sección(es) de ` +
      `${nombreComp} sin horario definido en el catálogo; se ignoraron.`);
  }
  const elegibles = conHorario.filter(
    (s) => !s.restringida || incluirRestringidas.has(s.seccion));
  const fuera = conHorario
    .filter((s) => s.restringida && !incluirRestringidas.has(s.seccion))
    .map((s) => s.seccion);
  if (fuera.length && !elegibles.length) {
    advertencias.push(
      `${curso.codigo} (${nombreComp}): TODAS las secciones disponibles son ` +
      `restringidas (${fuera.join(", ")}). 'Ver Restricciones' no significa no ` +
      `disponible — si alguna aplica a tu carrera/pénsum, márcala como permitida.`);
  }
  return elegibles;
}

export function buildOpcionesCurso(
  curso: Curso, incluirRestringidas: Set<string> = new Set(),
): { opciones: Opcion[]; advertencias: string[] } {
  const advertencias: string[] = [];

  const componentes: Array<[string, Seccion[]]> = [];
  if (curso.secciones_clase.length) {
    componentes.push([COMPONENTE_CLASE, curso.secciones_clase]);
  }
  for (const [categoria, secs] of curso.componentes_practicos) {
    componentes.push([categoria, secs]);
  }

  const gruposPorComponente: Array<[string, Seccion[][]]> = [];
  for (const [nombreComp, secs] of componentes) {
    const elegibles = filtrar(secs, incluirRestringidas, advertencias, curso, nombreComp);
    const grupos = agruparPorHorario(elegibles);
    if (!grupos.length) return { opciones: [], advertencias };
    gruposPorComponente.push([nombreComp, grupos]);
  }

  const opciones: Opcion[] = [];
  const gruposClaseConSalida = new Set<Seccion[]>();

  // producto cartesiano en el MISMO orden que itertools.product
  const listas = gruposPorComponente.map(([, g]) => g);
  const indices = new Array(listas.length).fill(0);
  while (true) {
    const eleccion = listas.map((l, i) => l[indices[i]]);
    let valido = true;
    const comps = [];
    const sesiones: Sesion[] = [];
    for (let i = 0; i < eleccion.length; i++) {
      const grupo = eleccion[i];
      const rep = grupo[0];
      const sesion: Sesion = {
        inicio_min: rep.inicio_min!, fin_min: rep.fin_min!, dias: rep.dias,
      };
      if (sesionesSeTraslapan([sesion], sesiones)) { valido = false; break; }
      sesiones.push(sesion);
      comps.push({ categoria: gruposPorComponente[i][0], sesion, secciones: grupo });
    }
    if (valido) {
      opciones.push({ componentes: comps });
      gruposClaseConSalida.add(eleccion[0]);
    }
    // avanzar índices (último componente primero, como product)
    let k = listas.length - 1;
    while (k >= 0) {
      indices[k]++;
      if (indices[k] < listas[k].length) break;
      indices[k] = 0;
      k--;
    }
    if (k < 0) break;
  }

  // Advertencia explícita: clase incompatible con TODOS sus prácticos
  if (gruposPorComponente.length > 1) {
    for (const grupo of gruposPorComponente[0][1]) {
      if (!gruposClaseConSalida.has(grupo)) {
        const rep = grupo[0];
        const secs = grupo.map((s) => s.seccion).join("/");
        const practicos = gruposPorComponente.slice(1).map(([n]) => n).join(", ");
        advertencias.push(
          `${curso.codigo} sección ${secs} (${rep.dias.join(" ")} ` +
          `${minToHHMM(rep.inicio_min!)}–${minToHHMM(rep.fin_min!)}) se ` +
          `traslapa con TODAS las secciones de ${practicos}: es ` +
          `matemáticamente imposible de inscribir completa.`);
      }
    }
  }

  if (!opciones.length) {
    advertencias.push(
      `${curso.codigo}: ninguna combinación interna de clase + componentes ` +
      `prácticos es posible sin traslape.`);
  }
  return { opciones, advertencias };
}
