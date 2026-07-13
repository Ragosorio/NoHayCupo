/** Grupos de WhatsApp/Telegram por sección — aportados por la comunidad.
 *
 * Los datos viven en `data/grupos.json`, generado SOLO por el script
 * `scripts/grupos/importar.mjs` a partir de un Excel validado contra el
 * catálogo real. Acá, del lado del navegador, RE-VALIDAMOS cada link antes
 * de mostrarlo: aunque un PR mal revisado colara un dominio raro en el JSON,
 * la app jamás abriría algo que no sea un grupo de WhatsApp o Telegram.
 */
import datos from "@/data/grupos.json";
import { E } from "./estado";

export interface Grupo { whatsapp?: string; telegram?: string }
type ArchivoGrupos = {
  periodo: string;
  actualizado: string;
  grupos: Record<string, Record<string, Grupo>>;
};

const ARCHIVO = datos as ArchivoGrupos;

/* Regex ESTRICTOS: solo el link canónico de invitación de cada app, sin
 * parámetros de tracking ni otros dominios. La MISMA validación corre en el
 * script (scripts/grupos/validar.mjs) — mantener ambos en sincronía. */
const RE_WHATSAPP = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/;
const RE_TELEGRAM = /^https:\/\/t\.me\/(\+[A-Za-z0-9_-]{5,40}|joinchat\/[A-Za-z0-9_-]{5,40}|[A-Za-z0-9_]{4,40})$/;

export function linkWhatsappValido(url: unknown): url is string {
  return typeof url === "string" && RE_WHATSAPP.test(url);
}
export function linkTelegramValido(url: unknown): url is string {
  return typeof url === "string" && RE_TELEGRAM.test(url);
}

/** Grupos válidos de una sección concreta de un curso, o null si no hay.
 * Solo devuelve links del periodo activo y que pasan el regex. */
export function grupoDeSeccion(codigo: string, seccion: string): Grupo | null {
  if (ARCHIVO.periodo !== E.semestre) return null;
  const bruto = ARCHIVO.grupos?.[codigo]?.[seccion];
  if (!bruto) return null;
  const limpio: Grupo = {};
  if (linkWhatsappValido(bruto.whatsapp)) limpio.whatsapp = bruto.whatsapp;
  if (linkTelegramValido(bruto.telegram)) limpio.telegram = bruto.telegram;
  return limpio.whatsapp || limpio.telegram ? limpio : null;
}

export const gruposActualizados = ARCHIVO.actualizado;
