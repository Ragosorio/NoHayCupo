/** GET /api/catalogo/{1|2|v1|v2} — catálogo de horarios parseado a JSON.
 * La CDN lo cachea (s-maxage): el sitio de la facultad recibe un puñado de
 * requests al día en total, sin importar cuántos estudiantes entren. */
import type { APIRoute } from "astro";
import { catalogoJson } from "@/lib/scraper/catalogo";
import { fetchTexto, HORARIOS_BASE, jsonCacheado, jsonError, TTL } from "@/lib/servidor";

export const prerender = false;

const RUTAS: Record<string, string> = {
  "1": "/horarios/semestre/1",
  "2": "/horarios/semestre/2",
  "v1": "/horarios/vacaciones/1",
  "v2": "/horarios/vacaciones/2",
};

export const GET: APIRoute = async ({ params }) => {
  const periodo = params.periodo ?? "";
  const ruta = RUTAS[periodo];
  if (!ruta) return jsonError(`Periodo desconocido: ${periodo} (usa 1, 2, v1 o v2)`, 400);
  try {
    const html = await fetchTexto(HORARIOS_BASE + ruta, TTL.catalogo);
    return jsonCacheado(catalogoJson(html, periodo), TTL.catalogo);
  } catch (e) {
    return jsonError(`No se pudo obtener el catálogo: ${(e as Error).message}`);
  }
};
