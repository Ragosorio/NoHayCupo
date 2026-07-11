/** Restricciones de secciones — puerto de scraper/restricciones.py.
 *
 * `parseReglas` corre en el SERVIDOR (endpoint /api/restricciones, cacheable
 * en CDN porque las reglas son iguales para todos). `evaluarReglas` corre en
 * el NAVEGADOR: el veredicto depende del carnet/carrera de cada estudiante.
 */

export interface Veredicto {
  veredicto: "aplica" | "no_aplica" | "revisar";
  detalle: string[];
  reglas: string[];
}

/** Extrae los textos de las reglas (<strong>...</strong>) del modal. */
export function parseReglas(html: string): string[] {
  const reglas: string[] = [];
  for (const m of html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)) {
    const t = m[1].replace(/<[^>]+>/g, " ").split(/\s+/).join(" ").trim();
    if (t) reglas.push(t);
  }
  return reglas;
}

const RE_CARNET = /CARNE\w*\s+FINALIZADO\s+EN\s*:?\s*([\d,\s]+)/i;
const RE_CARRERA = /SE\s+PERMITEN\s+ESTUDIANTES\s+DE\s*:?\s*(.+)/i;

/** Mayúsculas, sin tildes y espacios colapsados, para comparar carreras. */
function normCarrera(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .split(/\s+/).join(" ").trim();
}

export function evaluarReglas(
  reglas: string[], carnet = "", carrera = "CIENCIAS Y SISTEMAS",
): Veredicto {
  const digitos = (carnet || "").replace(/\D/g, "");
  const ultimo = digitos ? digitos[digitos.length - 1] : null;

  const detalle: string[] = [];
  let fallo = false;
  let duda = false;
  const carrerasPermitidas: string[] = [];

  for (const regla of reglas) {
    const mc = regla.match(RE_CARNET);
    if (mc) {
      const permitidos = [...new Set(mc[1].split(",").map((d) => d.trim())
        .filter((d) => /^\d$/.test(d)))].sort();
      if (ultimo === null) {
        duda = true;
        detalle.push(`Pide carnet terminado en ${permitidos.join(",")} — ingresá tu carnet para verificar.`);
      } else if (permitidos.includes(ultimo)) {
        detalle.push(`✓ Tu carnet termina en ${ultimo} (pide ${permitidos.join(",")}).`);
      } else {
        fallo = true;
        detalle.push(`✗ Tu carnet termina en ${ultimo} y esta sección pide ${permitidos.join(",")}.`);
      }
      continue;
    }
    const mr = regla.match(RE_CARRERA);
    if (mr) {
      carrerasPermitidas.push(mr[1].trim());
      continue;
    }
    duda = true;
    detalle.push(`Condición que debés confirmar vos: “${regla}”`);
  }

  if (carrerasPermitidas.length) {
    const objetivo = normCarrera(carrera || "");
    // Nombre completo ("INGENIERIA ...") exige igualdad exacta — un substring
    // haría que "INGENIERIA MECANICA" aceptara "INGENIERIA MECANICA INDUSTRIAL".
    const acepta = (c: string) => {
      const cn = normCarrera(c);
      return cn === objetivo ||
        (!objetivo.startsWith("INGENIERIA") && cn.includes(objetivo));
    };
    if (objetivo && carrerasPermitidas.some(acepta)) {
      detalle.push(`✓ Permite tu carrera (${carrera}).`);
    } else {
      fallo = true;
      detalle.push("✗ Solo permite: " + carrerasPermitidas.join("; ") + ".");
    }
  }

  return {
    veredicto: fallo ? "no_aplica" : duda ? "revisar" : "aplica",
    detalle,
    reglas,
  };
}
