/** Panel "Vos": carnet, periodo, carrera, resumen del pénsum y sincronización. */
import { useStore } from "@nanostores/react";
import {
  agregarElegibles, cambiarCarnet, cambiarCarrera, cambiarPeriodo, cambiarSync,
  cargarCatalogo, cursosElegibles, creditosAprobados, setModal,
} from "@/lib/cliente/acciones";
import { $v, E } from "@/lib/cliente/estado";
import { PERIODOS } from "@/lib/cliente/util";
import { IconoRefrescar } from "./Iconos";

export default function PanelPerfil() {
  useStore($v);
  const carreras = [...new Set(E.indicePensums.map((p) => p.carrera))].sort();
  const elegibles = cursosElegibles();
  const conOferta = elegibles.filter((c) => E.porCodigo.has(c.codigo));
  const porAgregar = conOferta.filter((c) => !E.seleccion.includes(c.codigo));

  return (
    <section className="panel" id="panelPerfil">
      <h2>Vos</h2>
      <label className="campo campo-grande campo-linea">
        <span>Carnet <em>(detecta pénsum y restricciones)</em></span>
        <input type="text" inputMode="numeric" placeholder="202100123" autoComplete="off"
          value={E.carnet} onChange={(ev) => cambiarCarnet(ev.target.value)} />
      </label>
      <label className="campo campo-grande campo-linea">
        <span>Periodo</span>
        <select value={E.semestre} title="Periodo del catálogo de horarios de la facultad"
          onChange={(ev) => cambiarPeriodo(ev.target.value)}>
          {PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}
        </select>
      </label>
      <label className="campo campo-grande campo-carrera">
        <span>Carrera <em>{E.pensumMeta}</em></span>
        <select value={E.carrera} disabled={!carreras.length}
          onChange={(ev) => cambiarCarrera(ev.target.value)}>
          {carreras.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>

      <div className="pensum-resumen">
        {E.pensum ? (
          <>
            <div className="stats">
              <div className="stat-chip"><strong>{E.aprobados.size}/{E.pensum.length}</strong>aprobados</div>
              <div className="stat-chip"><strong>{creditosAprobados()}</strong>créditos</div>
              <div className="stat-chip"><strong>{elegibles.length}</strong>podés llevar</div>
            </div>
            {E.catalogo && elegibles.length !== conOferta.length && (
              <p className="hint">{elegibles.length - conOferta.length} elegible(s) sin oferta este semestre.</p>
            )}
          </>
        ) : (
          <p className="hint">{E.pensumInfo || "Cargando tu red de estudios…"}</p>
        )}
      </div>

      <div className="pensum-botones">
        <button className="btn" disabled={!E.pensum} onClick={() => setModal("pensum", true)}>
          Abrir mi pénsum
        </button>
        {!E.sync && porAgregar.length > 0 && (
          <button className="btn btn-elegibles" onClick={agregarElegibles}>
            + Agregar los {porAgregar.length} que podés llevar
          </button>
        )}
      </div>

      <label className="check-linea"
        title="Al marcar cursos aprobados en el pénsum, tu lista se actualiza sola: entran los que ya podés llevar, salen los que no.">
        <input type="checkbox" checked={E.sync}
          onChange={(ev) => cambiarSync(ev.target.checked)} />
        <span>Mantener mi lista sincronizada con el pénsum</span>
      </label>
      <button className="btn-enlace" title="Vuelve a descargar el catálogo del sitio de la facultad"
        onClick={() => cargarCatalogo(true)}>
        <IconoRefrescar /> actualizar catálogo
      </button>
    </section>
  );
}
