/** Isla principal: layout completo de la app (sidebar + resultados + modales). */
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { abrirMenuMovil, cerrarMenuMovil, generar, iniciarApp, setModal } from "@/lib/cliente/acciones";
import { quitarAmigo } from "@/lib/cliente/compartir";
import { cerrarChat, precargarIA } from "@/lib/cliente/ia/chat";
import { $v, E } from "@/lib/cliente/estado";
import { iniciarTour } from "@/lib/cliente/tour";
import ChatIA from "./ChatIA";
import { IconoCalendarioHero } from "./Iconos";
import { AnimacionTema, ModalAcerca, ModalBienvenida, ModalCompartir, ModalPensum, Toast } from "./Modales";
import PanelCursos from "./PanelCursos";
import PanelPerfil from "./PanelPerfil";
import PanelTiempo from "./PanelTiempo";
import Resultados from "./Resultados";

export default function App() {
  useStore($v);

  useEffect(() => {
    iniciarApp();
    void precargarIA();   // si Cupito ya fue activado antes, cargarlo ya
    const alTeclear = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setModal("pensum", false);
        setModal("acerca", false);
        setModal("export", false);
        setModal("temas", false);
        setModal("compartir", false);
        cerrarChat();
      }
    };
    const alClic = (ev: MouseEvent) => {
      const objetivo = ev.target as HTMLElement;
      if (!objetivo.closest(".menu-export")) setModal("export", false);
      if (!objetivo.closest(".menu-temas")) setModal("temas", false);
    };
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("click", alClic);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("click", alClic);
    };
  }, []);

  return (
    <>
      {/* Fondo oscuro del drawer móvil: tocarlo cierra el menú. */}
      <div className="scrim no-print" aria-hidden="true" onClick={cerrarMenuMovil} />
      <main className="layout">
        <aside className="sidebar no-print">
          <PanelPerfil />
          <PanelCursos />
          <PanelTiempo />
          <section className="panel panel-generar">
            <button id="btnGenerar" className="btn btn-primary"
              disabled={E.seleccion.length === 0} onClick={() => generar(3)}>
              Generar horarios
            </button>
            {E.estadoGenerar && <p className="estado-generar">{E.estadoGenerar}</p>}
          </section>
        </aside>

        <section className="contenido">
          {E.amigo && (
            <div className="banner-amigo no-print">
              <span>
                <strong>{E.amigo.de}</strong> te compartió su horario: estos son sus
                cursos y secciones. Armá tu versión — las clases donde coincidan se
                marcan en el calendario.
              </span>
              <button className="btn btn-mini" onClick={quitarAmigo}>Dejar de comparar</button>
            </div>
          )}
          {E.resultado ? (
            <Resultados />
          ) : (
            <div id="vacioHero" className="hero">
              <div className="hero-icon" aria-hidden="true"><IconoCalendarioHero /></div>
              <h2>Tu horario ideal, sin traslapes</h2>
              <p className="hero-sub">
                Elegí tus cursos, contale a la app qué horas no querés usar,<br />
                y compará todas las combinaciones posibles del catálogo real.
              </p>
              <div className="hero-acciones">
                <button className="btn btn-primary btn-ancho-auto" onClick={iniciarTour}>
                  Mostrame cómo funciona
                </button>
                <button className="btn btn-ancho-auto solo-movil" onClick={abrirMenuMovil}>
                  Elegir mis cursos
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <ChatIA />
      <ModalPensum />
      <ModalAcerca />
      <ModalBienvenida />
      <ModalCompartir />
      <AnimacionTema />
      <Toast />
    </>
  );
}
