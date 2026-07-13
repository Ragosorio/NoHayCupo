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
    { element: "#modoSwitch", popover: { title: "4 · Dos formas de armarlo", description: "«Buscar el mejor» compara TODAS las combinaciones por vos. «Ya tengo mi horario» te deja poner tus secciones exactas y ver cómo queda — ideal después de la asignación, cuando ya sabés en qué quedaste." } },
    { element: "#btnGenerar", popover: { title: "5 · Armá tu horario", description: "Según el modo: calcula todas las combinaciones sin traslapes y las rankea, o te abre el constructor para elegir la sección de cada curso." } },
    { element: "#btnIA", popover: { title: "6 · Cupito, tu asistente", description: "Un asistente de IA que corre 100% en tu navegador (no se manda nada a ningún servidor). Pedile cosas como «armame un horario sin clases el viernes» y te ayuda a decidir." } },
  ];
  if (conResultados) {
    pasos.push(
      { element: "#tabsEstrategias", popover: { title: "Estrategias", description: "Cada pestaña ordena las mismas combinaciones con otra prioridad: salir temprano, entrar tarde, días libres o huecos parejos." } },
      { element: ".calendario", popover: { title: "Tocá un curso", description: "Hacé clic en cualquier clase del calendario para ver su detalle completo (horario, catedrático, auxiliar) y los grupos de WhatsApp/Telegram de esa sección que aporta la comunidad." } },
      { element: "#btnEditar", popover: { title: "Ajustar a mano", description: "¿Casi perfecto pero no exacto? Entrá al modo edición, tocá un curso y movelo a cualquier sección que quepa sin romper el resto." } },
      { element: "#btnExportar", popover: { title: "Llevátelo o compartilo", description: "Descargá tu horario como imagen o .ics para Google Calendar, imprimilo, o compartilo con un amigo por un link — así ven en qué clases coinciden." } },
    );
  } else {
    pasos.push({ element: "#vacioHero", popover: { title: "Y después…", description: "Vas a poder comparar estrategias, tocar cualquier curso para ver sus grupos de WhatsApp/Telegram, ajustar el horario a mano, y exportarlo o compartirlo con un amigo." } });
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
