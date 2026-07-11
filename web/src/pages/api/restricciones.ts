/** GET /api/restricciones?codigo&seccion&anio&periodo — reglas CRUDAS de una
 * sección restringida (texto igual para todos → CDN-cacheable 7 días).
 * La EVALUACIÓN contra carnet/carrera corre en el navegador de cada quien. */
import type { APIRoute } from "astro";
import { parseReglas } from "@/lib/scraper/restricciones";
import { fetchTexto, HORARIOS_BASE, jsonCacheado, jsonError, TTL } from "@/lib/servidor";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams;
  const codigo = q.get("codigo") ?? "";
  const seccion = q.get("seccion") ?? "";
  const anio = q.get("anio") ?? "";
  const periodo = q.get("periodo") ?? "";
  if (!/^\d{3,4}$/.test(codigo) || !seccion || !/^\d{4}$/.test(anio) || !periodo) {
    return jsonError("Parámetros: codigo, seccion, anio, periodo", 400);
  }
  try {
    const cuerpo = new URLSearchParams({ codigo, seccion, anio, periodo });
    const html = await fetchTexto(
      `${HORARIOS_BASE}/restricciones`, TTL.restricciones, {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: cuerpo.toString(),
      });
    return jsonCacheado({ codigo, seccion, reglas: parseReglas(html) }, TTL.restricciones);
  } catch (e) {
    return jsonError(`No se pudo obtener la restricción: ${(e as Error).message}`);
  }
};
