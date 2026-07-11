/** Búsqueda de combinaciones válidas (backtracking DFS con poda temprana).
 * Puerto 1:1 de engine/solver.py — mismo orden de exploración y resultados. */
import { sesionesDe, type Opcion, type Sesion } from "./models";
import { sesionesSeTraslapan } from "./overlap";

export type Requisito = [codigo: string, opciones: Opcion[]];
export type Combo = Array<[codigo: string, opcion: Opcion]>;

/** Todas las combinaciones sin traslapes. `sesionesBloqueadas` son los
 * bloqueos «imposible» del estudiante: cuentan como tiempo ya ocupado.
 * Explora primero los cursos con menos opciones (poda más temprano). */
export function findAllValidCombinations(
  requisitos: Requisito[],
  sesionesBloqueadas: Sesion[] = [],
  maxResultados = 200_000,
): Combo[] {
  const orden = requisitos.map((_, i) => i)
    .sort((a, b) => requisitos[a][1].length - requisitos[b][1].length);
  const resultados: Combo[] = [];

  const dfs = (pos: number, elegidos: Combo, ocupadas: Sesion[]): void => {
    if (resultados.length >= maxResultados) return;
    if (pos === orden.length) {
      resultados.push([...elegidos]);
      return;
    }
    const [nombre, opciones] = requisitos[orden[pos]];
    for (const op of opciones) {
      const sesiones = sesionesDe(op);
      if (!sesionesSeTraslapan(sesiones, ocupadas)) {
        elegidos.push([nombre, op]);
        dfs(pos + 1, elegidos, [...ocupadas, ...sesiones]);
        elegidos.pop();
      }
    }
  };
  dfs(0, [], [...sesionesBloqueadas]);

  // Restaurar el orden original de los cursos dentro de cada combinación.
  const posicion = new Map(requisitos.map(([nombre], i) => [nombre, i]));
  return resultados.map((combo) =>
    [...combo].sort((a, b) => posicion.get(a[0])! - posicion.get(b[0])!));
}

/** Para cada curso de una combinación: qué OTRAS opciones caben sin mover el
 * resto ("si la sección se llena"). Respeta los bloqueos «imposible». */
export function variantesEmergencia(
  combinacion: Combo, requisitos: Requisito[], sesionesBloqueadas: Sesion[] = [],
): Map<string, Opcion[]> {
  const opcionesPorCurso = new Map(requisitos);
  const elegidaPorCurso = new Map(combinacion);
  const out = new Map<string, Opcion[]>();
  for (const [codigo] of combinacion) {
    const resto: Sesion[] = [...sesionesBloqueadas];
    for (const [otro, op] of combinacion) {
      if (otro !== codigo) resto.push(...sesionesDe(op));
    }
    out.set(codigo, (opcionesPorCurso.get(codigo) ?? []).filter(
      (op) => op !== elegidaPorCurso.get(codigo) &&
        !sesionesSeTraslapan(sesionesDe(op), resto)));
  }
  return out;
}
