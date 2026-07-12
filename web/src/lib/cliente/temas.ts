/** Registro de temas. Los tokens de color viven en styles/global.css bajo
 * `[data-theme="id"]`; acá va solo la metadata que necesita el runtime:
 * el picker del header, el favicon dinámico y la elección de paleta de cursos.
 * Cómo crear un tema nuevo: docs/TEMAS.md. */

export interface Tema {
  id: string;
  nombre: string;
  descripcion: string;
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
  {
    id: "light", nombre: "Claro", descripcion: "El clásico de siempre",
    oscuro: false, acento: "#4f46e5", acentoTinta: "#ffffff", marco: "#ffffff",
  },
  {
    id: "dark", nombre: "Azul noche", descripcion: "Oscuro, tranquilo",
    oscuro: true, acento: "#7a76f0", acentoTinta: "#ffffff", marco: "#161b2b",
  },
  {
    id: "negro", nombre: "Medianoche", descripcion: "Negro total, para pantallas OLED",
    oscuro: true, acento: "#8b5cf6", acentoTinta: "#ffffff", marco: "#0e0e13",
  },
  {
    id: "morado", nombre: "Lavanda", descripcion: "Morado profundo con lila",
    oscuro: true, acento: "#a78bfa", acentoTinta: "#221a35", marco: "#1c1629",
  },
  {
    id: "rosa", nombre: "Pinky", descripcion: "Rosa con actitud",
    oscuro: false, acento: "#db2777", acentoTinta: "#ffffff", marco: "#ffffff",
  },
  {
    id: "matcha", nombre: "Matcha", descripcion: "Verde calmado, cero estrés",
    oscuro: false, acento: "#4d7c0f", acentoTinta: "#ffffff", marco: "#ffffff",
  },
  {
    id: "mocha", nombre: "Cafecito", descripcion: "Tonos cálidos de café",
    oscuro: false, acento: "#8a5a3b", acentoTinta: "#ffffff", marco: "#fffdf9",
  },
  {
    id: "futbol", nombre: "Modo fútbol", descripcion: "Césped nocturno, mundial 2026",
    oscuro: true, acento: "#e7b416", acentoTinta: "#221a04", marco: "#0e1f13",
    animacion: "futbol",
  },
  {
    id: "usac", nombre: "Modo USAC", descripcion: "Azul y blanco, tricentenaria",
    oscuro: false, acento: "#1355a5", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "usac",
  },
  {
    id: "cute", nombre: "Modo cute", descripcion: "Pastelitos, florcitas y un ajolote",
    oscuro: false, acento: "#a21caf", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "cute",
  },
  {
    id: "campeon", nombre: "Campeones", descripcion: "Albiceleste con la copa y el 10",
    oscuro: false, acento: "#1d6fb8", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "campeon",
  },
  {
    id: "siu", nombre: "SIUUU", descripcion: "El salto del 7, verde y rojo",
    oscuro: true, acento: "#2ebd59", acentoTinta: "#052012", marco: "#221013",
    animacion: "siu",
  },
  {
    id: "dtmf", nombre: "Verde DTMF", descripcion: "Debí tirar más fotos…",
    oscuro: false, acento: "#1a7f37", acentoTinta: "#ffffff", marco: "#ffffff",
    animacion: "dtmf",
  },
];

export const temaPorId = (id: string | null | undefined) =>
  TEMAS.find((t) => t.id === id);

export const esTemaOscuro = (id: string | null | undefined) =>
  temaPorId(id)?.oscuro ?? true;
