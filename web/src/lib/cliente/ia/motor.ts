/** Motor de IA 100% local, con dos niveles:
 *
 *  - "chrome": la Prompt API integrada de Chrome (Gemini Nano). Cero descarga
 *    nuestra — Chrome ya trae (o baja él mismo) el modelo. Soporta
 *    responseConstraint con JSON Schema.
 *  - "webllm": @mlc-ai/web-llm sobre WebGPU en un Web Worker. Descarga el
 *    modelo (~1 GB) de HuggingFace UNA vez y queda en el caché del navegador.
 *    El decoding restringido por gramática (xgrammar) garantiza el schema.
 *
 * Nada sale del navegador: ni el horario ni la conversación tocan un servidor.
 */
import type { MensajeMotor } from "./prompt";

export type TierIA = "chrome" | "webllm";
export type ProgresoIA = { texto: string; pct: number | null };

export interface MotorIA {
  tier: TierIA;
  etiqueta: string;
  /** Descarga/carga pesada por adelantado, para que la espera pase en la
   * pantalla de progreso y no escondida en el primer mensaje. */
  preparar?(): Promise<void>;
  /** `onTexto` recibe el JSON acumulado en cada chunk: permite mostrar el
   * campo "mensaje" mientras se escribe (efecto de tipeo real). */
  generarJSON(
    mensajes: MensajeMotor[], schema: object,
    onTexto?: (acumulado: string) => void,
  ): Promise<string>;
}

/** Modelo por defecto para WebLLM. El 1.5B confundía AM/PM y niveles de
 * bloqueo en pruebas reales; el 3B es el mínimo que se siente inteligente
 * en español y todavía corre en laptops comunes con WebGPU. */
export const MODELO_WEBLLM = "Qwen2.5-3B-Instruct-q4f16_1-MLC";
export const TAMANO_MODELO = "≈2 GB";

type LanguageModelApi = {
  availability(): Promise<string>;
  create(opts?: object): Promise<{
    prompt(texto: string, opts?: object): Promise<string>;
    promptStreaming?(texto: string, opts?: object): AsyncIterable<string>;
    destroy(): void;
  }>;
};

const lmApi = () => (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;

/** Qué motor puede correr este navegador. Prioridad: Chrome ya listo (cero
 * espera) → WebGPU para WebLLM → Chrome que aún debe bajar su modelo → nada. */
export async function detectarTier(): Promise<TierIA | null> {
  let chromeDisponible: string | null = null;
  try {
    const lm = lmApi();
    if (lm) chromeDisponible = await lm.availability();
  } catch { /* API a medio salir en algunas versiones: la ignoramos */ }
  if (chromeDisponible === "available") return "chrome";
  try {
    const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu && await gpu.requestAdapter()) return "webllm";
  } catch { /* sin WebGPU */ }
  if (chromeDisponible && chromeDisponible !== "unavailable") return "chrome";
  return null;
}

/* ---------- tier Chrome (Prompt API / Gemini Nano) ---------- */

function crearMotorChrome(onProgreso: (p: ProgresoIA) => void): MotorIA {
  const monitor = (m: EventTarget) => {
    m.addEventListener("downloadprogress", (e) => {
      const pct = (e as ProgressEvent).loaded ?? null;
      onProgreso({ texto: "Chrome está descargando su modelo local…", pct });
    });
  };
  return {
    tier: "chrome",
    etiqueta: "IA de Chrome (Gemini Nano, local)",
    /* Si Gemini Nano aún no está bajado, create() dispara la descarga: se
     * hace acá (con progreso visible) y no en el primer mensaje del usuario. */
    async preparar() {
      const lm = lmApi();
      if (!lm) return;
      const sesion = await lm.create({ monitor });
      sesion.destroy();
    },
    /* Sesión fresca por turno: la Prompt API acumula contexto por sesión, y
     * nuestro historial ya viaja completo en `mensajes` — así el snapshot de
     * estado nunca queda duplicado ni viejo dentro de la sesión. */
    async generarJSON(mensajes, schema, onTexto) {
      const lm = lmApi();
      if (!lm) throw new Error("La IA de Chrome dejó de estar disponible");
      const sesion = await lm.create({
        initialPrompts: mensajes.slice(0, -1),
        monitor,
      });
      const ultimo = mensajes[mensajes.length - 1].content;
      try {
        if (onTexto && sesion.promptStreaming) {
          let acum = "";
          for await (const parte of sesion.promptStreaming(ultimo, { responseConstraint: schema })) {
            // Según la versión de Chrome los chunks son deltas o acumulados.
            acum = parte.startsWith(acum) ? parte : acum + parte;
            onTexto(acum);
          }
          return acum;
        }
        return await sesion.prompt(ultimo, { responseConstraint: schema });
      } finally {
        sesion.destroy();
      }
    },
  };
}

/* ---------- tier WebLLM (WebGPU + worker) ---------- */

async function crearMotorWebLLM(onProgreso: (p: ProgresoIA) => void): Promise<MotorIA> {
  // Import dinámico: web-llm pesa varios MB y solo se paga al activar el chat.
  const webllm = await import("@mlc-ai/web-llm");
  const worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });
  const engine = await webllm.CreateWebWorkerMLCEngine(worker, MODELO_WEBLLM, {
    initProgressCallback: (p) => onProgreso({
      texto: p.text.replace(/\[.*?\]/g, "").trim() || "Preparando el modelo…",
      pct: typeof p.progress === "number" ? p.progress : null,
    }),
  });
  return {
    tier: "webllm",
    etiqueta: "Qwen 2.5 3B (local, WebGPU)",
    async generarJSON(mensajes, schema, onTexto) {
      const chunks = await engine.chat.completions.create({
        messages: mensajes,
        temperature: 0.2,
        max_tokens: 600,
        stream: true,
        response_format: { type: "json_object", schema: JSON.stringify(schema) },
      });
      let acum = "";
      for await (const ch of chunks) {
        acum += ch.choices[0]?.delta?.content ?? "";
        onTexto?.(acum);
      }
      return acum;
    },
  };
}

export async function crearMotor(
  tier: TierIA, onProgreso: (p: ProgresoIA) => void,
): Promise<MotorIA> {
  return tier === "chrome" ? crearMotorChrome(onProgreso) : crearMotorWebLLM(onProgreso);
}
