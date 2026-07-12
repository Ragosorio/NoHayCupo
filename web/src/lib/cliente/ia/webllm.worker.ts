/** Worker que hospeda el motor WebLLM: el modelo y la generación corren acá
 * para no congelar la UI. El protocolo lo maneja entero la librería. */
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
