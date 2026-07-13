/** Worker que hospeda el motor WebLLM: el modelo y la generación corren acá
 * para no congelar la UI. El protocolo lo maneja entero la librería. */
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);

// Ping de vida: si este módulo llegó a ejecutarse, el import funcionó.
// El main thread lo espera antes de conectar el motor (Safari puede fallar
// el import del worker y sin esto nadie se entera).
self.postMessage({ kind: "__cupito_vivo" });
