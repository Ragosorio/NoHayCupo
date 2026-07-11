/** GET /api/pensums — catálogo de pénsums descubiertos (estático: se genera
 * con legacy: scraper/escanear_pensums.py y vive commiteado en src/data). */
import type { APIRoute } from "astro";
import indice from "@/data/pensums.json";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ pensums: indice }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
