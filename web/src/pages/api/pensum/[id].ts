/** GET /api/pensum/{id} — red de estudios parseada. Cambia ~1 vez al año. */
import type { APIRoute } from "astro";
import indice from "@/data/pensums.json";
import { parsePensum } from "@/lib/scraper/pensum";
import { fetchTexto, jsonCacheado, jsonError, REDES_BASE, TTL } from "@/lib/servidor";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1 || id > 200) {
    return jsonError(`id de pénsum inválido: ${params.id}`, 400);
  }
  try {
    // El slug de la URL es cosmético: el id numérico decide el contenido.
    const html = await fetchTexto(
      `${REDES_BASE}/redesDeEstudio/ingenieriaEnCienciasYSistemas/${id}/clar`,
      TTL.pensum);
    const cursos = parsePensum(html);
    if (!cursos.length) return jsonError(`El pénsum ${id} no existe o cambió de formato`, 404);
    const meta = indice.find((p) => p.id === id);
    return jsonCacheado({
      id,
      carrera: meta?.carrera ?? `pénsum ${id}`,
      plan: meta?.plan ?? null,
      vigencia_desde: meta?.vigencia_desde ?? null,
      actualizado: new Date().toISOString().slice(0, 16).replace("T", " "),
      desde_cache: false,
      total_creditos: cursos.reduce((t, c) => t + (c.creditos ?? 0), 0),
      cursos,
    }, TTL.pensum);
  } catch (e) {
    return jsonError(`No se pudo obtener el pénsum: ${(e as Error).message}`);
  }
};
