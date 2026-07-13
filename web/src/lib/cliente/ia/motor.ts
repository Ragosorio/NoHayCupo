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
  /** Corta la generación en curso (la usa el timeout anti-cuelgue). */
  abortar?(): void;
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

type SesionLM = {
  prompt(entrada: unknown, opts?: object): Promise<string>;
  promptStreaming?(entrada: unknown, opts?: object): AsyncIterable<string>;
  clone?(): Promise<SesionLM>;
  destroy(): void;
};
type LanguageModelApi = {
  availability(): Promise<string>;
  create(opts?: object): Promise<SesionLM>;
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
  /* Declarar el idioma mejora la calidad y quita el warning de consola
   * («No output language was specified»); los Chrome viejos que no conocen
   * estas opciones caen al create() pelado. */
  const IDIOMA_ES = {
    expectedInputs: [{ type: "text", languages: ["es"] }],
    expectedOutputs: [{ type: "text", languages: ["es"] }],
  };
  async function crear(extra?: object): Promise<SesionLM> {
    const lm = lmApi();
    if (!lm) throw new Error("La IA de Chrome dejó de estar disponible");
    try {
      return await lm.create({ monitor, ...IDIOMA_ES, ...extra });
    } catch {
      return await lm.create({ monitor, ...extra });
    }
  }
  /* La sesión base guarda el prompt del sistema YA procesado; cada turno la
   * clona en vez de re-procesar todo el sistema (eso era lo que hacía que
   * cada mensaje tardara una eternidad). */
  let base: SesionLM | null = null;
  let activa: SesionLM | null = null;
  return {
    tier: "chrome",
    etiqueta: "IA de Chrome (Gemini Nano, local)",
    /* Si Gemini Nano aún no está bajado, create() dispara la descarga: se
     * hace acá (con progreso visible) y no en el primer mensaje del usuario. */
    async preparar() {
      const sesion = await crear();
      sesion.destroy();
    },
    abortar() {
      activa?.destroy();
      activa = null;
    },
    async generarJSON(mensajes, schema, onTexto) {
      if (!base) base = await crear({ initialPrompts: [mensajes[0]] });
      let entrada: unknown;
      if (base.clone) {
        activa = await base.clone();
        // El historial + estado + mensaje del usuario van como turnos.
        entrada = mensajes.slice(1);
      } else {
        // Chrome sin clone(): sesión fresca por turno, como antes.
        activa = await crear({ initialPrompts: mensajes.slice(0, -1) });
        entrada = mensajes[mensajes.length - 1].content;
      }
      const sesion = activa;
      try {
        if (onTexto && sesion.promptStreaming) {
          let acum = "";
          for await (const parte of sesion.promptStreaming(entrada, { responseConstraint: schema })) {
            // Según la versión de Chrome los chunks son deltas o acumulados.
            acum = parte.startsWith(acum) ? parte : acum + parte;
            onTexto(acum);
          }
          return acum;
        }
        return await sesion.prompt(entrada, { responseConstraint: schema });
      } finally {
        activa = null;
        sesion.destroy();
      }
    },
  };
}

/* ---------- tier WebLLM (WebGPU + worker) ---------- */

/** Espera a que el worker avise que su módulo cargó, o a que truene el
 * import (Safari: «Importing a module script failed»). Sin este ping,
 * CreateWebWorkerMLCEngine se queda esperando para siempre a un worker
 * muerto y el usuario nunca ve el error. */
function crearWorkerVivo(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });
    const alError = (e: ErrorEvent) => {
      w.terminate();
      reject(new Error(e.message || "El worker del modelo no pudo iniciar"));
    };
    const alMensaje = (ev: MessageEvent) => {
      if (ev.data?.kind !== "__cupito_vivo") return;
      w.removeEventListener("message", alMensaje);
      w.removeEventListener("error", alError);
      resolve(w);
    };
    w.addEventListener("message", alMensaje);
    w.addEventListener("error", alError);
  });
}

async function crearMotorWebLLM(onProgreso: (p: ProgresoIA) => void): Promise<MotorIA> {
  // Import dinámico: web-llm pesa varios MB y solo se paga al activar el chat.
  const webllm = await import("@mlc-ai/web-llm");
  const config = {
    initProgressCallback: (p: { text: string; progress?: number }) => onProgreso({
      texto: p.text.replace(/\[.*?\]/g, "").trim() || "Preparando el modelo…",
      pct: typeof p.progress === "number" ? p.progress : null,
    }),
  };
  // Los pesos q4f16 piden el feature "shader-f16"; si el GPU no lo trae
  // (Safari en algunas máquinas), se usa la variante f32 del MISMO modelo.
  let modelo = MODELO_WEBLLM;
  try {
    const gpu = (navigator as { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    if (adapter && !adapter.features.has("shader-f16")) {
      modelo = MODELO_WEBLLM.replace("q4f16_1", "q4f32_1");
    }
  } catch { /* se queda el default */ }
  let engine: import("@mlc-ai/web-llm").MLCEngineInterface;
  try {
    engine = await webllm.CreateWebWorkerMLCEngine(await crearWorkerVivo(), modelo, config);
  } catch (e) {
    // Safari a veces no puede importar módulos en workers: mismo motor,
    // hilo principal. La generación corre en GPU igual; solo se pierde el
    // aislamiento del worker.
    console.warn("[cupito] worker no disponible, usando el hilo principal", e);
    engine = await webllm.CreateMLCEngine(modelo, config);
  }
  return {
    tier: "webllm",
    etiqueta: "Qwen 2.5 3B (local, WebGPU)",
    abortar() {
      try { engine.interruptGenerate(); } catch { /* nada en curso */ }
    },
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
