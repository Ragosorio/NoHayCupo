/** Isla principal: layout completo de la app (sidebar + resultados + modales). */
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { abrirMenuMovil, cerrarDetalleCurso, cerrarMenuMovil, generar, generarConsulta, iniciarApp, setModal, setModo } from "@/lib/cliente/acciones";
import { quitarAmigo } from "@/lib/cliente/compartir";
import { cerrarChat, precargarIA } from "@/lib/cliente/ia/chat";
import { $v, E } from "@/lib/cliente/estado";
import { iniciarTour } from "@/lib/cliente/tour";
import ChatIA from "./ChatIA";
import { IconoCalendarioHero } from "./Iconos";
import { AnimacionTema, ModalAcerca, ModalBienvenida, ModalCompartir, ModalPensum, Toast } from "./Modales";
import ModalContribuir from "./ModalContribuir";
import ModalCurso from "./ModalCurso";
import ModalReset from "./ModalReset";
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
        setModal("contribuir", false);
        setModal("reset", false);
        cerrarDetalleCurso();
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
            <div className="modo-switch no-print" role="tablist" aria-label="Modo">
              <button role="tab" aria-selected={E.modo === "generar"}
                className={E.modo === "generar" ? "activa" : ""}
                onClick={() => setModo("generar")}>
                Buscar el mejor
              </button>
              <button role="tab" aria-selected={E.modo === "consulta"}
                className={E.modo === "consulta" ? "activa" : ""}
                onClick={() => setModo("consulta")}>
                Ya tengo mi horario
              </button>
            </div>
            {E.modo === "generar" ? (
              <button id="btnGenerar" className="btn btn-primary"
                disabled={E.seleccion.length === 0} onClick={() => generar(3)}>
                Generar horarios
              </button>
            ) : (
              <button id="btnGenerar" className="btn btn-primary"
                disabled={E.seleccion.length === 0} onClick={() => generarConsulta()}>
                Armar mi horario
              </button>
            )}
            <p className="modo-nota no-print">
              {E.modo === "generar"
                ? "Comparo todas las combinaciones sin traslapes y te muestro las mejores."
                : "Elegí tu sección exacta de cada curso y mirá cómo queda tu semana, con sus grupos."}
            </p>
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
              {E.modo === "consulta" ? (
                <>
                  <h2>Armá el horario que ya tenés</h2>
                  <p className="hero-sub">
                    {E.seleccion.length === 0
                      ? <>Primero agregá los cursos que vas a llevar en el panel de la izquierda.<br />Después elegís la sección exacta de cada uno y ves cómo queda tu semana.</>
                      : <>Ya tenés {E.seleccion.length} curso(s). Tocá <strong>«Armar mi horario»</strong> y elegí la sección de cada uno.</>}
                  </p>
                  <div className="hero-acciones">
                    <button className="btn btn-ancho-auto solo-movil" onClick={abrirMenuMovil}>
                      {E.seleccion.length === 0 ? "Agregar mis cursos" : "Ver mis cursos"}
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <ChatIA />
      <ModalCurso />
      <ModalContribuir />
      <ModalReset />
      <ModalPensum />
      <ModalAcerca />
      <ModalBienvenida />
      <ModalCompartir />
      <AnimacionTema />
      <Toast />
    </>
  );
}
