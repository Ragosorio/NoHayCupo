/** Barra superior — isla propia que comparte estado con la app vía nanostores. */
import { useStore } from "@nanostores/react";
import { alternarSidebar, cambiarTema, setModal } from "@/lib/cliente/acciones";
import { $v, E } from "@/lib/cliente/estado";
import { TEMAS } from "@/lib/cliente/temas";
import { IconoMenu, IconoPaleta, IconoX, LogoNHC } from "./Iconos";

export default function Header() {
  useStore($v);
  return (
    <header className="topbar">
      <div className="brand">
        <button id="btnMenu" className="btn btn-icono no-print" title="Mostrar u ocultar el panel lateral"
          aria-label="Alternar panel lateral" aria-expanded={E.menuMovil}
          onClick={alternarSidebar}>
          {E.menuMovil ? <IconoX /> : <IconoMenu />}
        </button>
        <div className="brand-mark"><LogoNHC /></div>
        <div>
          <h1>NoHayCupo</h1>
          <p>Horarios sin traslapes · FIUSAC</p>
        </div>
      </div>
      <div className="topbar-controls no-print">
        <span className="estado-catalogo">{E.estadoCatalogo}</span>
        <button className="btn btn-icono" title="Acerca de NoHayCupo"
          onClick={() => setModal("acerca", true)}>?</button>
        <div className="menu-temas">
          <button className="btn btn-icono" title="Cambiar tema" aria-label="Cambiar tema"
            aria-expanded={E.menuTemas}
            onClick={(ev) => { ev.stopPropagation(); setModal("temas", !E.menuTemas); }}>
            <IconoPaleta />
          </button>
          <div className="menu-temas-lista" hidden={!E.menuTemas}>
            {TEMAS.map((t) => (
              <button key={t.id} className={t.id === E.tema ? "activo" : ""}
                onClick={() => cambiarTema(t.id)}>
                <span className="tema-punto" style={{ background: t.acento }} />
                <span className="tema-info">
                  <strong>{t.nombre}</strong>
                  <small>{t.descripcion}</small>
                </span>
                {t.id === E.tema && <span className="tema-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
