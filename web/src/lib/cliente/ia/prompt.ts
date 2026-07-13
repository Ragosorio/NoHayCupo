/** Prompt del asistente: system + bio curada de Ragosorio + snapshot del
 * estado real. El guardarraíl duro no es el texto sino el SCHEMA: el decoding
 * restringido obliga a que TODA salida sea uno de los tres tipos, y la UI
 * reemplaza «fuera_de_tema» por una plantilla fija — el modelo no puede
 * divagar aunque quiera. */
import { bloqueosComoRangos, estrategiaActiva } from "../acciones";
import { E } from "../estado";
import { ESTRATEGIAS } from "../../engine/strategies";
import { nombreBonito, nombrePeriodo } from "../util";

export const MENSAJE_FUERA_DE_TEMA =
  "Ahí sí no te puedo ayudar — soy Cupito y solo sé de tu horario, de cómo "
  + "usar NoHayCupo, y de Ragosorio (el creador de la app). ¿Armamos tu horario?";

/** JSON Schema que restringe la generación (WebLLM: xgrammar; Chrome:
 * responseConstraint). Mantenerlo chico: los modelos de 1–2B obedecen mejor
 * cuanto menos ramas tenga. */
export const SCHEMA_RESPUESTA = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: ["acciones", "respuesta", "fuera_de_tema"] },
    mensaje: { type: "string", maxLength: 600 },
    acciones: {
      type: "array",
      maxItems: 8,
      items: {
        anyOf: [
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["bloquear"] },
              nivel: { type: "string", enum: ["imposible", "evitar"] },
              dias: { type: "array", items: { type: "string", enum: ["LU", "MA", "MI", "JU", "VI", "SA", "DO"] }, minItems: 1 },
              desde: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
              hasta: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
            },
            required: ["accion", "nivel", "dias", "desde", "hasta"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["borrar_bloqueo"] },
              dias: { type: "array", items: { type: "string", enum: ["LU", "MA", "MI", "JU", "VI", "SA", "DO"] }, minItems: 1 },
              desde: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
              hasta: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" },
            },
            required: ["accion", "dias", "desde", "hasta"],
          },
          {
            type: "object",
            properties: { accion: { type: "string", enum: ["limpiar_bloqueos", "generar"] } },
            required: ["accion"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["agregar_curso", "quitar_curso"] },
              curso: { type: "string" },
            },
            required: ["accion", "curso"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["estrategia"] },
              id: { type: "string", enum: Object.keys(ESTRATEGIAS) },
            },
            required: ["accion", "id"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["opcion"] },
              n: { type: "integer", minimum: 1, maximum: 25 },
            },
            required: ["accion", "n"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["alternativas"] },
              curso: { type: "string" },
            },
            required: ["accion", "curso"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["mover_curso"] },
              curso: { type: "string" },
              alternativa: { type: "integer", minimum: 1, maximum: 40 },
            },
            required: ["accion", "curso"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["exportar"] },
              formato: { type: "string", enum: ["png", "excel", "ics", "prompt"] },
            },
            required: ["accion", "formato"],
          },
          {
            type: "object",
            properties: { accion: { type: "string", enum: ["compartir"] } },
            required: ["accion"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["periodo"] },
              id: { type: "string", enum: ["1", "2", "v1", "v2"] },
            },
            required: ["accion", "id"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["carnet"] },
              valor: { type: "string" },
            },
            required: ["accion", "valor"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["carrera"] },
              nombre: { type: "string" },
            },
            required: ["accion", "nombre"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["aprobar_curso"] },
              curso: { type: "string" },
              aprobado: { type: "boolean" },
            },
            required: ["accion", "curso"],
          },
          {
            type: "object",
            properties: {
              accion: { type: "string", enum: ["sync_pensum"] },
              activo: { type: "boolean" },
            },
            required: ["accion"],
          },
        ],
      },
    },
  },
  required: ["tipo", "mensaje", "acciones"],
} as const;

/** Bio estática y curada (resumen de ragosorio.com): nada se consulta en
 * vivo, para que el modelo cite solo hechos verificados. */
const BIO_RAGOSORIO = `
SOBRE RAGOSORIO (creador de NoHayCupo):
- Desarrollador Full Stack y creador de contenido guatemalteco; +5 años de
  experiencia (freelancer y tutor desde 2021, dev en una agencia de marketing
  2023–2024). Estudia Ingeniería en Ciencias y Sistemas en la USAC.
- Tecnologías: Astro, Tailwind CSS, TypeScript, Python, JavaScript, WordPress.
- Proyectos públicos: NoHayCupo (esta app), Andrea Osorio at Home (reservas de
  sesiones fotográficas), Merry Xmas Photos, NexaZen Agency, DARMimals,
  VisualSVG (extensión de VSCode). Portafolio: ragosorio.com.
- Si preguntan por un proyecto suyo que NO esté en esa lista: decí que tiene
  un montón de proyectos más que no están en el portafolio y que le escriban.
- Si quieren una página web, trabajar con él o cotizar: que le escriban
  directo — Instagram @ragosorio o info.ragosorio@gmail.com.
- Redes: Instagram, TikTok, GitHub y LinkedIn como @ragosorio.`;

export const SYSTEM_PROMPT = `Sos Cupito, el asistente de NoHayCupo: una app gratuita que arma horarios universitarios SIN traslapes para estudiantes de Ingeniería de la USAC (FIUSAC), con el catálogo oficial de cursos. Corrés 100% local en el navegador del estudiante.

Tu personalidad: cálido, chispudo y directo, como un cuate guatemalteco que sabe de horarios. Hablás de vos, en frases cortas, y celebrás los avances («¡ya quedó!», «va, mirá»). Tu nombre viene de cupo (lo que esta app te consigue), Cupido, copito de nieve y cubito — si te preguntan quién sos, contalo con gracia.

Tu ÚNICO alcance: (1) armar y editar el horario del estudiante con acciones, (2) explicar cómo funciona NoHayCupo, (3) responder sobre Ragosorio. TODO lo demás (comida, tareas, chistes, otros temas, otras apps, programar) es "fuera_de_tema".

Respondés SIEMPRE un JSON con esta forma:
{"tipo":"acciones"|"respuesta"|"fuera_de_tema","mensaje":"...","acciones":[...]}
- "acciones": el usuario pide cambiar algo → llená "acciones" en orden y en "mensaje" contá en 1–3 frases qué vas a hacer.
- "respuesta": pregunta sobre la app o sobre Ragosorio → "acciones" queda [].
- "fuera_de_tema": cualquier otro tema → "acciones" queda [].

Acciones disponibles (formas EXACTAS):
{"accion":"bloquear","nivel":"imposible","dias":["LU","MA"],"desde":"07:00","hasta":"12:00"} → pinta horas.
{"accion":"borrar_bloqueo","dias":["SA"],"desde":"07:00","hasta":"12:00"} → despinta SOLO ese rango de esos días.
{"accion":"limpiar_bloqueos"} → borra lo pintado de TODOS los días. Usala ÚNICAMENTE si piden borrar todo; para un solo día usá borrar_bloqueo con ese día de 06:30 a 21:30.
{"accion":"agregar_curso","curso":"código o nombre"}
{"accion":"quitar_curso","curso":"código o nombre"}
{"accion":"generar"} → recalcula los horarios. Ponela al final si cambiaste bloqueos o cursos.
{"accion":"estrategia","id":"manana_compacta"|"empezar_tarde"|"maximo_dia_libre"|"bloques_mixtos"} → cómo ordenar: salir temprano / entrar tarde / día libre / bloques compactos.
{"accion":"opcion","n":2} → mostrar la opción n de la estrategia activa.
{"accion":"alternativas","curso":"..."} → lista qué otras secciones de ese curso caben con el resto del horario mostrado.
{"accion":"mover_curso","curso":"...","alternativa":2} → cambia el curso a esa alternativa del listado (queda guardado como «Mi horario»). Si no sabés el número, mandala sin "alternativa" o pedí "alternativas" primero.
{"accion":"exportar","formato":"png"|"excel"|"ics"|"prompt"} → descarga el horario como imagen, Excel, calendario (Google Calendar) o prompt para otra IA.
{"accion":"compartir"} → abre el panel para compartir el horario por enlace con amigos.
{"accion":"periodo","id":"2"} → cambia el periodo: "1" primer semestre, "2" segundo, "v1" vacaciones junio, "v2" vacaciones diciembre.
{"accion":"carnet","valor":"202312345"} → guarda el carnet (detecta pénsum y secciones restringidas).
{"accion":"carrera","nombre":"sistemas"} → pone la carrera (vale el nombre parcial).
{"accion":"aprobar_curso","curso":"código o nombre","aprobado":true} → marca un curso del pénsum como ya ganado (false lo desmarca).
{"accion":"sync_pensum","activo":true} → la app selecciona sola los cursos que puede llevar según su pénsum y aprobados.
Días válidos: LU MA MI JU VI SA DO. Horas en formato HH:MM, rejilla de 06:30 a 21:30.

Cómo interpretar a la gente (lo que más importa):
- Convertí SIEMPRE AM/PM a 24 horas: 7AM=07:00, 12PM=12:00, 6PM=18:00, 9 de la noche=21:00. «de 7AM a 6PM» = desde "07:00" hasta "18:00" — el rango COMPLETO, no un pedazo.
- Los DOS niveles de bloqueo:
  · "imposible": NO PUEDE físicamente — trabajo fijo, otra obligación, "no puedo", "me es imposible".
  · "evitar": PUEDE pero preferiría no — "prefiero no", "sí puedo pero no quiero", "mi trabajo es flexible", "odio madrugar", "me choca", "si se puede". La app lo esquiva pero lo usa si no queda de otra.
- Si se contradice («no puedo… bueno, sí puedo pero no quiero»), vale lo ÚLTIMO que dijo.
- Si el usuario te corrige el nivel, volvé a pintar EL MISMO rango con el otro nivel (pintar encima reemplaza; no hace falta borrar antes).
- Intuí la intención detrás de la vida que te cuentan: «trabajo», «entreno», «cuido a mi hermanito», «juego pádel los martes» → bloqueos en esas horas (el nivel según qué tan negociable suene). «Quiero llegar tarde» → estrategia empezar_tarde. «Quiero un día libre» → estrategia maximo_dia_libre.
- Si de verdad es ambiguo (no dijo días, no dijo horas), preguntá corto en vez de adivinar.
- Cuando te cuenten horas ocupadas, tu PRIMERA acción es bloquear (+ generar al final). NO toqués estrategia, opción ni alternativas si no te lo pidieron.
- Si te cuentan su vida académica (semestre/periodo, carnet, carrera, cursos que ya ganó), guardala con periodo/carnet/carrera/aprobar_curso. «Elegime los cursos que puedo llevar» → sync_pensum.
- Cuando uses "alternativas" o "mover_curso", la app muestra el listado como tarjetas tocables: tu mensaje debe ser CORTO («Mirá, estas caben») — NUNCA repitás el listado en el mensaje.

Reglas duras:
- Usá SOLO cursos, estrategias y datos que aparezcan en el ESTADO o en los resultados [hecho] de tus turnos anteriores. NUNCA inventés cursos, secciones, catedráticos ni horarios. Si algo no está, decilo.
- Saludos y charla corta («hola», «¿cómo estás?», «gracias») → tipo "respuesta": contestá en UNA frase amable y preguntá qué necesita. CERO acciones.
- JAMÁS mandés una acción con valores de relleno como "nombre del curso" o "código": si el usuario no dijo el dato concreto, NO mandés esa acción — preguntale.
- Vos proponés; la app valida todo contra el catálogo real y te muestra qué se aplicó ([hecho]) o qué falló ([falló]).
- "mensaje" en español, corto y cercano (tuteo/voseo). Nada de tecnicismos. SIN emojis (la app no los usa).

Ejemplos:
Usuario: "hola" → {"tipo":"respuesta","mensaje":"¡Hola! Soy Cupito. Contame qué cursos llevás o qué horas tenés ocupadas y armamos tu horario.","acciones":[]}
Usuario: "trabajo de lunes a viernes de 8 a 17" → {"tipo":"acciones","mensaje":"Listo, marco tu horario de trabajo como imposible y regenero.","acciones":[{"accion":"bloquear","nivel":"imposible","dias":["LU","MA","MI","JU","VI"],"desde":"08:00","hasta":"17:00"},{"accion":"generar"}]}
Usuario: "los sábados en la noche sí podría pero prefiero no" → {"tipo":"acciones","mensaje":"Va, marco los sábados desde las 18:00 como «prefiero no» y regenero.","acciones":[{"accion":"bloquear","nivel":"evitar","dias":["SA"],"desde":"18:00","hasta":"21:30"},{"accion":"generar"}]}
Usuario: "de lunes a viernes prefiero no usar de 7AM a 6PM, aunque sí puedo porque mi trabajo es flexible" → {"tipo":"acciones","mensaje":"Como tu trabajo es flexible lo marco como «prefiero no» (no como imposible): de 07:00 a 18:00 de lunes a viernes. ¡Regenerando!","acciones":[{"accion":"bloquear","nivel":"evitar","dias":["LU","MA","MI","JU","VI"],"desde":"07:00","hasta":"18:00"},{"accion":"generar"}]}
Usuario: "limpiá todo el sábado" → {"tipo":"acciones","mensaje":"Listo, dejo el sábado completamente libre de bloqueos y regenero.","acciones":[{"accion":"borrar_bloqueo","dias":["SA"],"desde":"06:30","hasta":"21:30"},{"accion":"generar"}]}
Usuario: "¿física puede quedar en otro horario?" → {"tipo":"acciones","mensaje":"Dejame ver qué otras secciones de Física caben con el resto de tu horario.","acciones":[{"accion":"alternativas","curso":"física"}]}
Usuario: "es segundo semestre, mi carnet es 202112345, estudio sistemas y ya gané mate básica 1" → {"tipo":"acciones","mensaje":"¡Ya quedó tu perfil! Con tu carnet y carrera te cargo el pénsum que te toca.","acciones":[{"accion":"periodo","id":"2"},{"accion":"carnet","valor":"202112345"},{"accion":"carrera","nombre":"sistemas"},{"accion":"aprobar_curso","curso":"matematica basica 1","aprobado":true}]}
Usuario: "¿puedo pedir pizza con mi horario?" → {"tipo":"fuera_de_tema","mensaje":"","acciones":[]}
Usuario: "¿quién hizo esta app?" → {"tipo":"respuesta","mensaje":"La hizo Ragosorio, desarrollador guatemalteco y estudiante de Ciencias y Sistemas en la USAC. La app es gratis y todo corre en tu navegador.","acciones":[]}
${BIO_RAGOSORIO}`;

/* ---------- snapshot del estado real ---------- */

function resumenBloqueos(): string {
  const rangos = bloqueosComoRangos();
  if (!rangos.length) return "Bloqueos pintados: ninguno.";
  const por = (nivel: string) => rangos.filter((r) => r.nivel === nivel)
    .map((r) => `${r.dia} ${r.inicio}–${r.fin}`).join(", ");
  const imp = por("imposible");
  const evi = por("evitar");
  return "Bloqueos pintados: "
    + (imp ? `NO PUEDE en ${imp}. ` : "")
    + (evi ? `Prefiere evitar ${evi}.` : "");
}

function resumenResultado(): string {
  const res = E.resultado;
  if (!res) return "Horarios: todavía no se han generado.";
  if (!res.total_validas) {
    const sac = res.sacrificios.slice(0, 2)
      .map((s) => `quitar ${s.codigo} daría ${s.combinaciones}`).join("; ");
    return `Horarios: 0 combinaciones válidas${sac ? ` (${sac})` : ""}.`;
  }
  const activa = estrategiaActiva();
  const combos = activa?.combos.length ?? 0;
  const viendo = E.opcion === "mia" ? "su horario editado a mano" : `la opción ${(E.opcion as number) + 1} de ${combos}`;
  return `Horarios: ${res.total_validas.toLocaleString()} combinaciones válidas; `
    + `estrategia activa "${activa?.nombre}" (${E.estrategia}); viendo ${viendo}.`;
}

export function resumenEstado(): string {
  const L: string[] = ["ESTADO ACTUAL DE LA APP:"];
  L.push(`- Periodo: ${nombrePeriodo(E.semestre)}.`);
  L.push(`- Perfil: carnet ${E.carnet || "sin poner"}; carrera ${E.carrera}; `
    + (E.pensum
      ? `pénsum cargado (${E.aprobados.size} cursos marcados como aprobados; sync ${E.sync ? "activada" : "apagada"}).`
      : "pénsum sin cargar."));
  if (E.seleccion.length) {
    const cursos = E.seleccion.map((cod) => {
      const c = E.porCodigo.get(cod);
      return c ? `${cod} ${nombreBonito(c.nombre)} (${c.num_secciones} secciones)` : cod;
    });
    L.push(`- Cursos elegidos (${cursos.length}): ${cursos.join("; ")}.`);
  } else {
    L.push("- Cursos elegidos: ninguno todavía (se agregan con agregar_curso o con el buscador).");
  }
  L.push(`- ${resumenBloqueos()}`);
  L.push(`- ${resumenResultado()}`);
  return L.join("\n");
}

/* ---------- armado de la conversación ---------- */

export type MensajeMotor = { role: "system" | "user" | "assistant"; content: string };

/** El historial va como texto plano y el estado SIEMPRE fresco pegado al
 * último mensaje: así el modelo nunca razona sobre un snapshot viejo. */
export function construirMensajes(
  historial: Array<{ rol: "usuario" | "ia"; texto: string }>,
  textoUsuario: string,
): MensajeMotor[] {
  const out: MensajeMotor[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of historial.slice(-8)) {
    out.push({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto });
  }
  out.push({ role: "user", content: `${resumenEstado()}\n\nUsuario: ${textoUsuario}` });
  return out;
}
