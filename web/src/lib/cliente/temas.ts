/** Registro de temas. Los tokens de color viven en styles/global.css bajo
 * `[data-theme="id"]`; acá va solo la metadata que necesita el runtime:
 * el picker del header, el favicon dinámico y la elección de paleta de cursos.
 * Cómo crear un tema nuevo: docs/TEMAS.md.
 *
 * Los temas "de fandom" son homenajes con arte propio (siluetas, paletas,
 * escenas estilizadas): nada de sprites ni logos registrados. */

export interface Tema {
  id: string;
  nombre: string;
  descripcion: string;
  /** Sección del picker: Clásicos | La cancha | Mundial 2026 | Con vibra | Fandom. */
  grupo: string;
  /** Decide la paleta de colores de cursos y el color-scheme del navegador. */
  oscuro: boolean;
  /** Color del favicon y del puntito en el picker (debe ser el --acento). */
  acento: string;
  /** Color de las letras NHC sobre el acento (el --acento-tinta). */
  acentoTinta: string;
  /** Color de la UI del navegador (<meta name="theme-color">): el --tarjeta. */
  marco: string;
  /** Id de la animación de bienvenida (rama en AnimacionTema, opcional). */
  animacion?: string;
}

export const TEMAS: Tema[] = [
  /* ---- Clásicos ---- */
  {
    id: "light", nombre: "Claro", descripcion: "El clásico de siempre", grupo: "Clásicos",
    oscuro: false, acento: "#4f46e5", acentoTinta: "#ffffff", marco: "#ffffff",
  },
  {
    id: "dark", nombre: "Azul noche", descripcion: "Oscuro, tranquilo", grupo: "Clásicos",
    oscuro: true, acento: "#7a76f0", acentoTinta: "#10132b", marco: "#161b2b",
  },
  {
    id: "negro", nombre: "Medianoche", descripcion: "Negro total, para pantallas OLED", grupo: "Clásicos",
    oscuro: true, acento: "#8b5cf6", acentoTinta: "#0a0512", marco: "#0e0e13",
  },
  {
    id: "morado", nombre: "Lavanda", descripcion: "Morado profundo con lila", grupo: "Clásicos",
    oscuro: true, acento: "#a78bfa", acentoTinta: "#221a35", marco: "#1c1629",
  },
  {
    id: "rosa", nombre: "Pinky", descripcion: "Rosa con actitud", grupo: "Clásicos",
    oscuro: false, acento: "#db2777", acentoTinta: "#ffffff", marco: "#ffffff",
  },
  {
    id: "matcha", nombre: "Matcha", descripcion: "Verde calmado, cero estrés", grupo: "Clásicos",
    oscuro: false, acento: "#4d7c0f", acentoTinta: "#ffffff", marco: "#ffffff",
  },
  {
    id: "mocha", nombre: "Cafecito", descripcion: "Tonos cálidos de café", grupo: "Clásicos",
    oscuro: false, acento: "#8a5a3b", acentoTinta: "#ffffff", marco: "#fffdf9",
  },

  /* ---- La cancha ---- */
  {
    id: "futbol", nombre: "Modo fútbol", descripcion: "Césped nocturno, mundial 2026", grupo: "La cancha",
    oscuro: true, acento: "#e7b416", acentoTinta: "#221a04", marco: "#0e1f13",
    animacion: "futbol",
  },
  {
    id: "campeon", nombre: "Campeones", descripcion: "Albiceleste con la copa y el 10", grupo: "La cancha",
    oscuro: false, acento: "#1d6fb8", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "campeon",
  },
  {
    id: "siu", nombre: "SIUUU", descripcion: "El salto del 7, verde y rojo", grupo: "La cancha",
    oscuro: true, acento: "#2ebd59", acentoTinta: "#052012", marco: "#221013",
    animacion: "siu",
  },
  {
    id: "vikingo", nombre: "El vikingo", descripcion: "Celeste nórdico del 9, modo zen", grupo: "La cancha",
    oscuro: true, acento: "#6cabdd", acentoTinta: "#0b1620", marco: "#12222e",
    animacion: "vikingo",
  },
  {
    id: "chapin", nombre: "Chapín", descripcion: "Azul, blanco y un quetzal", grupo: "La cancha",
    oscuro: false, acento: "#2374a8", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "chapin",
  },

  /* ---- Mundial 2026 (Argentina ya es «Campeones» y Guate es «Chapín») ---- */
  {
    id: "colombia", nombre: "Colombia", descripcion: "Tricolor con sabor a café", grupo: "Mundial 2026",
    oscuro: false, acento: "#1a4fa0", acentoTinta: "#ffffff", marco: "#fffdf5",
    animacion: "colombia",
  },
  {
    id: "francia", nombre: "Francia", descripcion: "Bleu, blanc, rouge et la tour", grupo: "Mundial 2026",
    oscuro: false, acento: "#0055a4", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "francia",
  },
  {
    id: "noruega", nombre: "Noruega", descripcion: "Noche polar con aurora boreal", grupo: "Mundial 2026",
    oscuro: true, acento: "#d94b64", acentoTinta: "#2b060d", marco: "#0e1b36",
    animacion: "noruega",
  },
  {
    id: "suecia", nombre: "Suecia", descripcion: "Azul profundo, cruz amarilla", grupo: "Mundial 2026",
    oscuro: true, acento: "#fecc02", acentoTinta: "#241d02", marco: "#0d2440",
    animacion: "suecia",
  },
  {
    id: "mexico", nombre: "México", descripcion: "Verde bandera y confeti", grupo: "Mundial 2026",
    oscuro: false, acento: "#046a38", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "mexico",
  },
  {
    id: "caboverde", nombre: "Cabo Verde", descripcion: "Océano, estrellas y morabeza", grupo: "Mundial 2026",
    oscuro: false, acento: "#1d4fa4", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "caboverde",
  },

  /* ---- Con vibra ---- */
  {
    id: "cute", nombre: "Modo cute", descripcion: "Pastelitos, florcitas y un ajolote", grupo: "Con vibra",
    oscuro: false, acento: "#a21caf", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "cute",
  },
  {
    id: "dtmf", nombre: "Verde DTMF", descripcion: "Debí tirar más fotos…", grupo: "Con vibra",
    oscuro: false, acento: "#1a7f37", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "dtmf",
  },
  {
    id: "playero", nombre: "Corazón playero", descripcion: "Un verano sin cupo", grupo: "Con vibra",
    oscuro: false, acento: "#0b7a6f", acentoTinta: "#ffffff", marco: "#fffdf8",
    animacion: "playero",
  },
  {
    id: "psicodelico", nombre: "Psicodélico", descripcion: "Colores que dan vueltas", grupo: "Con vibra",
    oscuro: false, acento: "#7c3aed", acentoTinta: "#ffffff", marco: "#fffdf9",
    animacion: "psicodelico",
  },
  {
    id: "estrellada", nombre: "Noche estrellada", descripcion: "Remolinos a lo Van Gogh", grupo: "Con vibra",
    oscuro: true, acento: "#f0c53f", acentoTinta: "#241c04", marco: "#131f42",
    animacion: "estrellada",
  },
  {
    id: "pandora", nombre: "Pandora", descripcion: "Bioluminiscencia azul", grupo: "Con vibra",
    oscuro: true, acento: "#35d0e0", acentoTinta: "#062226", marco: "#0c1f29",
    animacion: "pandora",
  },
  {
    id: "pasarela", nombre: "Pasarela", descripcion: "Crema, negro y dorado de lujo", grupo: "Con vibra",
    oscuro: false, acento: "#171310", acentoTinta: "#f6f2ea", marco: "#fffdf8",
    animacion: "pasarela",
  },

  /* ---- Fandom ---- */
  {
    id: "usac", nombre: "Modo USAC", descripcion: "Azul y blanco, tricentenaria", grupo: "Fandom",
    oscuro: false, acento: "#1355a5", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "usac",
  },
  {
    id: "atrapalos", nombre: "Atrápalos", descripcion: "Rojo y blanco, hay que atraparlos todos", grupo: "Fandom",
    oscuro: false, acento: "#cc2b2b", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "atrapalos",
  },
  {
    id: "nivel11", nombre: "Nivel 1-1", descripcion: "Bloques, tuberías y una moneda", grupo: "Fandom",
    oscuro: false, acento: "#d2401e", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "nivel11",
  },
  {
    id: "rosadito", nombre: "Rosadito", descripcion: "Rompe la pantalla con su mazo", grupo: "Fandom",
    oscuro: false, acento: "#d13472", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "rosadito",
  },
  {
    id: "gallo", nombre: "La fría", descripcion: "Negro y dorado, bien helada", grupo: "Fandom",
    oscuro: true, acento: "#e8b422", acentoTinta: "#241a02", marco: "#171512",
    animacion: "gallo",
  },
  {
    id: "burbujas", nombre: "Burbujas", descripcion: "Rojo clásico, qué refrescante", grupo: "Fandom",
    oscuro: false, acento: "#c8102e", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "burbujas",
  },
  {
    id: "chasquido", nombre: "El chasquido", descripcion: "Seis gemas y polvo cósmico", grupo: "Fandom",
    oscuro: true, acento: "#c9a227", acentoTinta: "#241a04", marco: "#1b1229",
    animacion: "chasquido",
  },
];

export const temaPorId = (id: string | null | undefined) =>
  TEMAS.find((t) => t.id === id);

export const esTemaOscuro = (id: string | null | undefined) =>
  temaPorId(id)?.oscuro ?? true;
