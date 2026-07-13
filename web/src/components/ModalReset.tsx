/** Confirmación de «borrar mis datos»: modal claro en vez de un alert nativo.
 * Borra todo lo guardado en el navegador excepto el tema elegido. */
import { useStore } from "@nanostores/react";
import { resetearTodo, setModal } from "@/lib/cliente/acciones";
import { $v, E } from "@/lib/cliente/estado";
import { IconoAlerta } from "./Iconos";

export default function ModalReset() {
  useStore($v);
  if (!E.modalReset) return null;
  return (
    <div className="modal-fondo no-print"
      onClick={(ev) => { if (ev.target === ev.currentTarget) setModal("reset", false); }}>
      <div className="modal-caja modal-reset">
        <header className="modal-header">
          <div>
            <h2>¿Borrar tus datos de este navegador?</h2>
            <p className="modal-sub">Empezás de cero, como la primera vez.</p>
          </div>
          <button className="btn btn-icono" title="Cerrar" onClick={() => setModal("reset", false)}>✕</button>
        </header>

        <div className="modal-reset-cuerpo">
          <div className="curso-disclaimer">
            <IconoAlerta />
            <p>
              Se borra <strong>todo lo guardado en este navegador</strong>: tus cursos,
              tu horario armado, tu carnet y tu pénsum. Se conserva únicamente el
              <strong> tema</strong> que elegiste. Esto no se puede deshacer.
            </p>
          </div>
          <p className="hint">
            Te lo recomendamos solo cuando cambiés de horarios (por ejemplo, al empezar
            un semestre nuevo) o si querés prestarle la app a alguien más.
          </p>

          <div className="modal-reset-btns">
            <button className="btn" onClick={() => setModal("reset", false)}>Cancelar</button>
            <button className="btn btn-peligro" onClick={resetearTodo}>
              Sí, borrar todo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
