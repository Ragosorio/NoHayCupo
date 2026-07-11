/** Utilidades de los endpoints: fetch a los sitios de la facultad con caché
 * en memoria (sobrevive mientras la lambda esté caliente) + headers de CDN.
 *
 * La estrategia de recursos vive acá: la CDN de Vercel absorbe casi todo con
 * s-maxage + stale-while-revalidate; el caché en memoria evita golpear a la
 * facultad cuando varias requests llegan a la MISMA lambda caliente.
 */

export const HORARIOS_BASE =
  import.meta.env.HORARIOS_BASE_URL ?? "https://usuarios.ingenieria.usac.edu.gt";
export const REDES_BASE =
  import.meta.env.REDES_BASE_URL ?? "https://redesestudio.ingenieria.usac.edu.gt";
const USER_AGENT =
  import.meta.env.SCRAPER_USER_AGENT ?? "NoHayCupo/2.0 (github.com/Ragosorio/NoHayCupo)";

const num = (v: string | undefined, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};
export const TTL = {
  catalogo: num(import.meta.env.CACHE_CATALOGO_SEGUNDOS, 21600),        // 6 h
  pensum: num(import.meta.env.CACHE_PENSUM_SEGUNDOS, 2592000),          // 30 días
  restricciones: num(import.meta.env.CACHE_RESTRICCIONES_SEGUNDOS, 604800), // 7 días
};

const memoria = new Map<string, { texto: string; expira: number }>();

export async function fetchTexto(
  url: string, ttlSegundos: number, init?: RequestInit,
): Promise<string> {
  const clave = `${url}|${init?.method ?? "GET"}|${init?.body ?? ""}`;
  const hit = memoria.get(clave);
  if (hit && hit.expira > Date.now()) return hit.texto;

  const resp = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(45_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} al pedir ${url}`);
  const texto = await resp.text();
  memoria.set(clave, { texto, expira: Date.now() + ttlSegundos * 1000 });
  return texto;
}

/** Respuesta JSON con los headers que hacen que la CDN trabaje por nosotros. */
export function jsonCacheado(data: unknown, sMaxage: number, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, s-maxage=${sMaxage}, stale-while-revalidate=${sMaxage * 4}`,
    },
  });
}

export function jsonError(mensaje: string, status = 502): Response {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",   // los errores no se cachean jamás
    },
  });
}
