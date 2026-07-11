/** Barra superior — isla propia que comparte estado con la app vía nanostores. */
import { useStore } from "@nanostores/react";
import { alternarSidebar, alternarTema, setModal } from "@/lib/cliente/acciones";
import { $v, E } from "@/lib/cliente/estado";
import { IconoLuna, IconoMenu, IconoSol, IconoX, LogoNHC } from "./Iconos";

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
        <button className="btn btn-icono"
          title={E.tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          onClick={alternarTema}>
          {E.tema === "dark" ? <IconoSol /> : <IconoLuna />}
        </button>
      </div>
    </header>
  );
}
