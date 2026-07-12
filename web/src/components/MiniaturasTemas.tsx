/** Miniaturas del picker de temas: cada tema se presenta con una escena
 * chiquita que lo representa (cancha, copa, florcita…), no con un color
 * cualquiera. Si un tema no tiene arte propio, cae al punto de color. */
import type { Tema } from "@/lib/cliente/temas";

const M = ({ fondo, children }: { fondo: string; children?: React.ReactNode }) => (
  <svg className="tema-mini" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <rect width="24" height="24" rx="7" fill={fondo} />
    {children}
  </svg>
);

export default function MiniaturaTema({ tema }: { tema: Tema }) {
  switch (tema.id) {
    case "light":   // solecito sobre cielo claro
      return (
        <M fondo="#f5f6f8">
          <circle cx="12" cy="12" r="4.6" fill="#f2b01e" />
          <g stroke="#f2b01e" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
          </g>
        </M>
      );
    case "dark":    // luna sobre azul noche
      return (
        <M fondo="#161b2b">
          <path d="M16.5 13.8A6 6 0 1 1 10 5.6a4.8 4.8 0 0 0 6.5 8.2Z" fill="#7a76f0" />
          <circle cx="17" cy="7" r="1" fill="#a2abbe" />
        </M>
      );
    case "negro":   // luna fina sobre negro total
      return (
        <M fondo="#050507">
          <path d="M15.8 14.6A5.4 5.4 0 1 1 10.2 6a4.4 4.4 0 0 0 5.6 8.6Z" fill="#8b5cf6" />
          <circle cx="6.5" cy="7" r=".8" fill="#5c5c6b" />
          <circle cx="17.5" cy="17.5" r=".8" fill="#5c5c6b" />
        </M>
      );
    case "morado":  // destello lila
      return (
        <M fondo="#1c1629">
          <path d="M12 4.5 13.9 10l5.6 2-5.6 2L12 19.5 10.1 14l-5.6-2 5.6-2Z" fill="#a78bfa" />
        </M>
      );
    case "rosa":    // corazón fucsia
      return (
        <M fondo="#fdf1f7">
          <path d="M12 18.6 6.3 12.8a3.6 3.6 0 0 1 5.1-5.1l.6.6.6-.6a3.6 3.6 0 0 1 5.1 5.1Z" fill="#db2777" />
        </M>
      );
    case "matcha":  // hojita de té
      return (
        <M fondo="#f3f7ef">
          <path d="M12 19.5c-4.8-1.5-6.8-6.3-5.4-12 5.7-1.4 10.5.6 12 5.4 1 3.4-3.2 7.6-6.6 6.6Z" fill="#4d7c0f" />
          <path d="M7.5 8.2 16 16.6" stroke="#f3f7ef" strokeWidth="1.4" strokeLinecap="round" />
        </M>
      );
    case "mocha":   // tacita de café
      return (
        <M fondo="#f7f1ea">
          <path d="M5.5 9h10v5.2a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4Z" fill="#8a5a3b" />
          <path d="M15.5 10.2h1.6a2.2 2.2 0 0 1 0 4.4h-1.6" fill="none" stroke="#8a5a3b" strokeWidth="1.5" />
          <path d="M8.5 4.5c0 1.1 1.2 1.3 1.2 2.4M11.8 4.5c0 1.1 1.2 1.3 1.2 2.4" stroke="#b08968" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </M>
      );
    case "futbol":  // cancha con pelota
      return (
        <M fondo="#0e5c2a">
          <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="none" stroke="#e8f6ec" strokeWidth="1" opacity=".7" />
          <path d="M2.5 12h19" stroke="#e8f6ec" strokeWidth="1" opacity=".7" />
          <circle cx="12" cy="12" r="3.4" fill="#fff" />
          <path d="M12 10.3l1.6 1.2-.6 1.9h-2l-.6-1.9Z" fill="#1a1a1a" />
        </M>
      );
    case "usac":    // franjas azul y blanco
      return (
        <M fondo="#1355a5">
          <rect x="0" y="9" width="24" height="6" fill="#ffffff" />
          <circle cx="12" cy="12" r="2.6" fill="#1355a5" />
          <circle cx="12" cy="12" r="1.2" fill="#e7b416" />
        </M>
      );
    case "cute":    // florcita pastel
      return (
        <M fondo="#faf1fb">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="12" cy="7.8" rx="2.6" ry="3.4" fill="#f0a8d8"
              transform={`rotate(${a} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="2.6" fill="#a21caf" />
        </M>
      );
    case "campeon": // franjas albicelestes con estrella dorada
      return (
        <M fondo="#75aadb">
          <rect x="8" y="0" width="8" height="24" fill="#ffffff" />
          <path d="M12 7.2l1.2 2.5 2.8.4-2 2 .5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-2 2.8-.4Z" fill="#d4a017" />
        </M>
      );
    case "siu":     // verde/rojo con el 7
      return (
        <M fondo="#9e1b1b">
          <rect x="0" y="0" width="9" height="24" fill="#1d7a3c" />
          <text x="15.5" y="17" textAnchor="middle" fontSize="13" fontWeight="900"
            fill="#fff" fontFamily="system-ui, sans-serif">7</text>
        </M>
      );
    case "dtmf":    // verde con corazón rotito
      return (
        <M fondo="#1a7f37">
          <path d="M12 18.6 6.3 12.8a3.6 3.6 0 0 1 5.1-5.1l.6.6.6-.6a3.6 3.6 0 0 1 5.1 5.1Z" fill="#ffffff" />
          <path d="m12 8.6-1.2 2.4 2.2 1.8-1.6 2.6" fill="none" stroke="#1a7f37" strokeWidth="1.3" strokeLinejoin="round" />
        </M>
      );
    case "vikingo": // el 9 celeste sobre azul nórdico
      return (
        <M fondo="#0b1620">
          <path d="M4 19c2.5-3 5.5-3 8-1.5S17.5 19 20 17" stroke="#274a61" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <text x="12" y="15.5" textAnchor="middle" fontSize="12" fontWeight="900"
            fill="#6cabdd" fontFamily="system-ui, sans-serif">9</text>
        </M>
      );
    case "chapin":  // bandera con quetzal estilizado
      return (
        <M fondo="#4997d0">
          <rect x="8" y="0" width="8" height="24" fill="#ffffff" />
          <path d="M12 8c2.4 0 4 1.8 3.4 3.8-.5 1.6-2 2.2-3.4 2.2-1.4 0-2.9-.6-3.4-2.2C8 9.8 9.6 8 12 8Z" fill="#1f7a3d" />
          <path d="M11 14c-.6 2.4-2 4.2-3.8 5.4" stroke="#1f7a3d" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <circle cx="13" cy="10.5" r=".9" fill="#c8102e" />
        </M>
      );
    case "playero": // atardecer de playa con corazoncito
      return (
        <M fondo="#fdf4e7">
          <circle cx="12" cy="12" r="4.2" fill="#f0a24c" />
          <rect x="0" y="13" width="24" height="11" fill="#0f9b8e" />
          <path d="M12 20.8 9.4 18a1.7 1.7 0 0 1 2.4-2.4l.2.2.2-.2a1.7 1.7 0 0 1 2.4 2.4Z" fill="#e5484d" />
        </M>
      );
    case "psicodelico": // anillos arcoíris
      return (
        <M fondo="#fff7ed">
          <circle cx="12" cy="12" r="9" fill="#7c3aed" />
          <circle cx="12" cy="12" r="7" fill="#0284c7" />
          <circle cx="12" cy="12" r="5.2" fill="#4caf50" />
          <circle cx="12" cy="12" r="3.4" fill="#f0b429" />
          <circle cx="12" cy="12" r="1.7" fill="#e5484d" />
        </M>
      );
    case "estrellada": // remolino dorado y estrella
      return (
        <M fondo="#0a1430">
          <path d="M4.5 13c2-4.5 7-5 9.5-2.2 1.8 2 .7 4.6-1.5 4.8-1.8.2-3-1.3-2.3-2.7"
            stroke="#f0c53f" strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <circle cx="18" cy="6.5" r="1.8" fill="#f0c53f" />
          <circle cx="6" cy="6" r="1" fill="#eef1fa" />
        </M>
      );
    case "pandora": // esporas que brillan
      return (
        <M fondo="#06131a">
          <circle cx="8" cy="9" r="2.6" fill="#35d0e0" opacity=".9" />
          <circle cx="16" cy="13.5" r="1.8" fill="#35d0e0" opacity=".7" />
          <circle cx="11" cy="17" r="1.2" fill="#35d0e0" opacity=".55" />
          <path d="M8 6.4V4M16 11.7V9.6" stroke="#35d0e0" strokeWidth="1" strokeLinecap="round" opacity=".6" />
        </M>
      );
    case "pasarela": // rombos de monograma con línea dorada
      return (
        <M fondo="#f6f2ea">
          <path d="M6 3 9 6 6 9 3 6Zm12 0 3 3-3 3-3-3ZM6 15l3 3-3 3-3-3Zm12 0 3 3-3 3-3-3Z" fill="#171310" opacity=".85" />
          <path d="M2 12h20" stroke="#b8860b" strokeWidth="1.6" />
        </M>
      );
    case "atrapalos": // la esfera roja y blanca
      return (
        <M fondo="#f7f4f4">
          <circle cx="12" cy="12" r="8.5" fill="#ffffff" stroke="#241c1c" strokeWidth="1.6" />
          <path d="M3.5 12a8.5 8.5 0 0 1 17 0Z" fill="#cc2b2b" />
          <path d="M3.5 12h17" stroke="#241c1c" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.6" fill="#fff" stroke="#241c1c" strokeWidth="1.6" />
        </M>
      );
    case "nivel11": // bloque ? y ladrillo
      return (
        <M fondo="#5c94fc">
          <rect x="3" y="13" width="8" height="8" fill="#b1533a" stroke="#7a2e1d" strokeWidth="1" />
          <path d="M3 17h8M7 13v8" stroke="#7a2e1d" strokeWidth="1" />
          <rect x="12.5" y="4" width="8" height="8" fill="#f0b429" stroke="#8a5a00" strokeWidth="1" />
          <text x="16.5" y="10.4" textAnchor="middle" fontSize="7" fontWeight="900"
            fill="#8a5a00" fontFamily="system-ui, sans-serif">?</text>
        </M>
      );
    case "rosadito": // la bolita rosada
      return (
        <M fondo="#ffeef5">
          <circle cx="12" cy="12.5" r="7.5" fill="#f7a8c4" />
          <circle cx="9.5" cy="11" r="1.3" fill="#3d2030" />
          <circle cx="14.5" cy="11" r="1.3" fill="#3d2030" />
          <circle cx="7.6" cy="14" r="1.5" fill="#ef7fa8" />
          <circle cx="16.4" cy="14" r="1.5" fill="#ef7fa8" />
          <path d="M10.7 14.6q1.3 1.2 2.6 0" stroke="#3d2030" strokeWidth="1" fill="none" strokeLinecap="round" />
        </M>
      );
    case "gallo":   // tarro dorado sobre negro
      return (
        <M fondo="#0c0b09">
          <path d="M7 9.5h8v9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 7 18.5Z" fill="#e8b422" />
          <path d="M15 11h1.6a2 2 0 0 1 0 4H15" fill="none" stroke="#e8b422" strokeWidth="1.4" />
          <ellipse cx="11" cy="9.5" rx="4.6" ry="2" fill="#f7f0dc" />
          <circle cx="9" cy="7.8" r="1.3" fill="#f7f0dc" />
          <circle cx="12.6" cy="7.2" r="1.6" fill="#f7f0dc" />
        </M>
      );
    case "burbujas": // onda blanca sobre rojo y gas subiendo
      return (
        <M fondo="#c8102e">
          <path d="M0 13c5-3.5 9 3.5 14 0s7-1.8 10-3.4" stroke="#ffffff" strokeWidth="2" fill="none" />
          <circle cx="6" cy="7" r="1.1" fill="#fff" opacity=".8" />
          <circle cx="10" cy="4.8" r=".8" fill="#fff" opacity=".6" />
          <circle cx="17" cy="18" r="1.2" fill="#fff" opacity=".7" />
        </M>
      );
    case "colombia": // tricolor con la mitad amarilla
      return (
        <M fondo="#fcd116">
          <rect x="0" y="12" width="24" height="6" fill="#1a4fa0" />
          <rect x="0" y="18" width="24" height="6" fill="#ce1126" />
        </M>
      );
    case "francia": // bleu-blanc-rouge con la torre
      return (
        <M fondo="#ffffff">
          <rect x="0" y="0" width="8" height="24" fill="#0055a4" />
          <rect x="16" y="0" width="8" height="24" fill="#ef4135" />
          <path d="M12 5.5 9.6 18.5h1.7l.7-8.5.7 8.5h1.7Z" fill="#131c33" />
          <path d="M9.8 15h4.4" stroke="#131c33" strokeWidth="1.2" />
        </M>
      );
    case "noruega": // aurora sobre la noche polar
      return (
        <M fondo="#071125">
          <path d="M3 16C7 9 11 13 14 8s5-3 7-6" stroke="#3ddc97" strokeWidth="3"
            fill="none" strokeLinecap="round" opacity=".85" />
          <circle cx="6" cy="6" r="1" fill="#ecf1fa" />
          <circle cx="18" cy="18.5" r="1.2" fill="#d94b64" />
        </M>
      );
    case "suecia": // la cruz nórdica amarilla
      return (
        <M fondo="#0d2440">
          <rect x="7.5" y="0" width="5" height="24" fill="#fecc02" />
          <rect x="0" y="9.5" width="24" height="5" fill="#fecc02" />
        </M>
      );
    case "mexico": // tricolor vertical con el centro
      return (
        <M fondo="#ffffff">
          <rect x="0" y="0" width="8" height="24" fill="#046a38" />
          <rect x="16" y="0" width="8" height="24" fill="#ce1126" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="#8a5a3b" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="1.1" fill="#8a5a3b" />
        </M>
      );
    case "caboverde": // océano con franjas y círculo de estrellas
      return (
        <M fondo="#1d4fa4">
          <rect x="0" y="13" width="24" height="2.4" fill="#ffffff" />
          <rect x="0" y="15.4" width="24" height="2.4" fill="#cf2027" />
          <rect x="0" y="17.8" width="24" height="2.4" fill="#ffffff" />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = 4.6, x = 9 + r * Math.cos((a * Math.PI) / 180), y = 15 + r * Math.sin((a * Math.PI) / 180);
            return <circle key={a} cx={x} cy={y} r="1" fill="#fcd116" />;
          })}
        </M>
      );
    case "chasquido": // seis gemas en arco
      return (
        <M fondo="#120b1d">
          {[["#7c3aed", 5, 15], ["#0284c7", 7.6, 10.6], ["#4caf50", 12, 8.6], ["#f0b429", 16.4, 10.6], ["#e5484d", 19, 15], ["#f97316", 12, 16.5]].map(([c, x, y], i) => (
            <circle key={i} cx={x as number} cy={y as number} r="1.9" fill={c as string} />
          ))}
        </M>
      );
    default:
      return <span className="tema-punto" style={{ background: tema.acento }} />;
  }
}
