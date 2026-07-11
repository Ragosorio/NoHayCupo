/** Detección de traslapes entre sesiones (día + rango horario).
 * Puerto 1:1 de engine/overlap.py. */
import type { Sesion } from "./models";

/** True si alguna sesión de `a` se traslapa en día+horario con alguna de `b`.
 * Dos sesiones que solo se tocan (una termina 10:30 y la otra empieza 10:30)
 * NO se consideran traslape: la comparación es estricta. */
export function sesionesSeTraslapan(a: Sesion[], b: Sesion[]): boolean {
  for (const s1 of a) {
    for (const s2 of b) {
      if (s1.dias.some((d) => s2.dias.includes(d))) {
        if (s1.inicio_min < s2.fin_min && s2.inicio_min < s1.fin_min) return true;
      }
    }
  }
  return false;
}
