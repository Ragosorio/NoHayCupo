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
    default:
      return <span className="tema-punto" style={{ background: tema.acento }} />;
  }
}
