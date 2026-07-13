/** Panel del asistente IA local. Se abre desde la topbar; todo corre en el
 * navegador (Prompt API de Chrome o WebLLM), nada sale a un servidor. */
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import {
  activarIA, cerrarChat, confirmarPendientes, descartarPendientes,
  elegirAlternativa, enviarMensaje,
} from "@/lib/cliente/ia/chat";
import { etiquetaAccion } from "@/lib/cliente/ia/herramientas";
import { TAMANO_MODELO } from "@/lib/cliente/ia/motor";
import { exportarPrompt } from "@/lib/cliente/exportar";
import { $v, E, type MensajeChat } from "@/lib/cliente/estado";
import { IconoChispa, IconoX } from "./Iconos";

function Burbuja({ m }: { m: MensajeChat }) {
  return (
    <div className={`chat-burbuja ${m.rol === "usuario" ? "es-usuario" : "es-ia"}`}>
      {m.texto && <p>{m.texto}</p>}
      {(m.hechos?.length || m.errores?.length) ? (
        <ul className="chat-chips">
          {m.hechos?.map((h, i) => <li key={`h${i}`} className="chat-chip">{h}</li>)}
          {m.errores?.map((e, i) => <li key={`e${i}`} className="chat-chip chip-error">{e}</li>)}
        </ul>
      ) : null}
      {m.opciones && (
        <div className="chat-opciones">
          {m.opciones.lista.map((op) => (
            <button key={op.n} className="chat-opcion"
              onClick={() => void elegirAlternativa(m, m.opciones!.curso, op.n)}>
              <span className="chat-opcion-n">{op.n}</span>
              <span className="chat-opcion-detalle">
                {op.etiqueta.split(" + ").map((linea, i) => <span key={i}>{linea}</span>)}
              </span>
            </button>
          ))}
        </div>
      )}
      {m.pendientes && (
        <div className="chat-confirmar">
          <p>Esto borra algo — ¿lo hago?</p>
          <ul>
            {m.pendientes.map((a, i) => <li key={i}>{etiquetaAccion(a)}</li>)}
          </ul>
          <div className="chat-confirmar-botones">
            <button className="btn btn-mini" onClick={() => confirmarPendientes(m)}>Sí, dale</button>
            <button className="btn btn-mini" onClick={() => descartarPendientes(m)}>Mejor no</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CuerpoChat() {
  const [texto, setTexto] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const c = E.chat;
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [c.mensajes.length, c.pensando]);

  const mandar = () => {
    if (!texto.trim()) return;
    void enviarMensaje(texto);
    setTexto("");
  };

  return (
    <>
      <div className="chat-mensajes">
        {c.mensajes.map((m, i) => <Burbuja key={i} m={m} />)}
        {c.pensando && (c.parcial ? (
          <div className="chat-burbuja es-ia">
            <p>{c.parcial}<span className="caret-ia" aria-hidden="true" /></p>
          </div>
        ) : (
          <div className="chat-burbuja es-ia chat-pensando" aria-label="Cupito está pensando">
            {/* Solo hablar de descarga cuando DE VERDAD está bajando algo;
                el resto del tiempo, puntitos de tipeo (+ pista si tarda). */}
            {c.progreso.texto && c.progreso.pct != null && c.progreso.pct < 1
              ? `${c.progreso.texto} ${Math.round(c.progreso.pct * 100)}%`
              : (
                <>
                  <span className="puntos-ia" aria-hidden="true"><i /><i /><i /></span>
                  {c.pista && <span className="chat-pista">{c.pista}</span>}
                </>
              )}
          </div>
        ))}
        <div ref={finRef} />
      </div>
      <form className="chat-entrada" onSubmit={(ev) => { ev.preventDefault(); mandar(); }}>
        <input
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          placeholder="Ej: trabajo de 8 a 5 y odio madrugar"
          aria-label="Mensaje para el asistente"
          disabled={c.pensando}
        />
        <button className="btn" type="submit" disabled={c.pensando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </>
  );
}

export default function ChatIA() {
  useStore($v);
  const c = E.chat;
  if (!c.abierto) return null;

  return (
    <aside className="chat-ia no-print" role="dialog" aria-label="Cupito, asistente IA">
      <header className="chat-header">
        <IconoChispa />
        <div>
          <strong>Cupito</strong>
          <small>IA 100% local · nada sale de tu navegador</small>
        </div>
        <button className="btn btn-icono" aria-label="Cerrar a Cupito" onClick={cerrarChat}>
          <IconoX />
        </button>
      </header>

      {c.fase === "detectando" && (
        <div className="chat-estado"><p>Viendo qué puede tu navegador…</p></div>
      )}

      {c.fase === "no-disponible" && (
        <div className="chat-estado">
          <p><strong>Tu navegador no puede correr la IA local.</strong></p>
          <p>
            Necesita WebGPU (Chrome o Edge recientes en computadora). En el
            teléfono suele no alcanzar la memoria.
          </p>
          <p>
            Plan B: copiá el <em>prompt para IA</em> con todos tus datos y
            pegalo en tu IA favorita (ChatGPT, Claude, Gemini…).
          </p>
          <button className="btn" onClick={exportarPrompt}>Copiar prompt para IA</button>
        </div>
      )}

      {c.fase === "intro" && (
        <div className="chat-estado">
          <p>
            <strong>Cupito, tu copiloto de horarios.</strong> Contale tu
            semestre («trabajo de 8 a 5», «quiero los viernes libres») y él
            pinta tus bloqueos, agrega o quita cursos, mueve secciones y genera
            tu horario — siempre con el catálogo real.
          </p>
          <p>
            {c.tier === "chrome"
              ? "Usa la IA que ya trae Chrome: no descarga nada extra."
              : `La primera vez descarga un modelo de ${TAMANO_MODELO}; queda guardado y después abre al instante.`}
            {" "}Todo corre en tu máquina: tu horario y la conversación no salen
            de tu navegador.
          </p>
          <button className="btn btn-primary" onClick={() => void activarIA()}>
            {c.tier === "chrome" ? "Despertar a Cupito" : `Despertar a Cupito (baja ${TAMANO_MODELO} una vez)`}
          </button>
        </div>
      )}

      {c.fase === "cargando" && (
        <div className="chat-estado chat-carga">
          <div className="chat-carga-icono" aria-hidden="true"><IconoChispa /></div>
          <p className="chat-carga-pct">
            {c.progreso.pct != null ? `${Math.round(c.progreso.pct * 100)}%` : "…"}
          </p>
          <div className="chat-progreso" role="progressbar"
            aria-valuenow={c.progreso.pct != null ? Math.round(c.progreso.pct * 100) : undefined}
            aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${Math.round((c.progreso.pct ?? 0) * 100)}%` }} />
          </div>
          <p>{c.progreso.texto || "Despertando a Cupito…"}</p>
          <small>
            Solo esta primera vez toca esperar — el modelo queda guardado en tu
            navegador y después Cupito abre al instante. Podés cerrar este panel:
            la descarga sigue y el avance se ve en el botón de arriba.
          </small>
        </div>
      )}

      {c.fase === "error" && (
        <div className="chat-estado">
          <p><strong>No se pudo cargar el modelo.</strong></p>
          <p className="chip-error chat-chip">{c.error}</p>
          <button className="btn" onClick={() => void activarIA()}>Reintentar</button>
        </div>
      )}

      {c.fase === "listo" && <CuerpoChat />}
    </aside>
  );
}
