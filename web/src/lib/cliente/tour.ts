/** Tour guiado con driver.js — mismo guion que la app original. */
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { abrirMenuMovil, cerrarMenuMovil, esMovil } from "./acciones";
import { E } from "./estado";

export function iniciarTour() {
  const conResultados = !!E.resultado;
  const pasos = [
    { element: "#panelPerfil", popover: { title: "1 · Contale quién sos", description: "Elegí el periodo, abrí tu pénsum y marcá lo aprobado: la app sabe qué podés llevar. Con tu carnet, las secciones restringidas se verifican solas. Nada sale de tu navegador." } },
    { element: "#panelCursos", popover: { title: "2 · Tus cursos", description: "Buscá por código o nombre. Si un curso tiene laboratorio, se inscriben juntos y la app garantiza que no choquen." } },
    { element: "#panelTiempo", popover: { title: "3 · Tu tiempo", description: "Pintá arrastrando: «Imposible» = intocable (jamás se usa). «Mejor no» = se evita cuanto se pueda. Es opcional." } },
    { element: "#btnGenerar", popover: { title: "4 · Generar", description: "Se calculan TODAS las combinaciones sin traslapes y se rankean con 4 estrategias distintas." } },
  ];
  if (conResultados) {
    pasos.push(
      { element: "#tabsEstrategias", popover: { title: "Estrategias", description: "Cada pestaña ordena las mismas combinaciones con otra prioridad: salir temprano, entrar tarde, días libres o huecos parejos." } },
      { element: "#btnEditar", popover: { title: "Ajustar a mano", description: "¿Casi perfecto pero no exacto? Entrá al modo edición, tocá un curso y movelo a cualquier sección que quepa." } },
      { element: "#btnExportar", popover: { title: "Llevátelo", description: "Descargá tu horario como imagen, importalo a Google Calendar (.ics) o imprimilo." } },
    );
  } else {
    pasos.push({ element: "#vacioHero", popover: { title: "Y después de generar…", description: "Vas a poder comparar estrategias, ajustar el horario a mano moviendo cursos, y exportarlo a PNG o Google Calendar." } });
  }
  driver({
    showProgress: true,
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "¡Listo!",
    progressText: "{{current}} de {{total}}",
    steps: pasos,
    // En móvil los panels viven en el drawer: abrirlo cuando el paso apunta
    // adentro y cerrarlo cuando apunta a los resultados.
    onHighlightStarted: (el) => {
      if (!esMovil()) return;
      if (el instanceof Element && el.closest(".sidebar")) abrirMenuMovil();
      else cerrarMenuMovil();
    },
    onDestroyed: () => { if (esMovil()) cerrarMenuMovil(); },
  }).drive();
}
