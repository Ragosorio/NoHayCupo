/** Íconos SVG inline (sin emojis, política de la casa). */

export const IconoSol = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
  </svg>
);

export const IconoLuna = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
  </svg>
);

export const IconoLapiz = ({ size = 13 }: { size?: number }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

export const IconoAlerta = () => (
  <svg className="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconoPlay = () => (
  <svg className="ico" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4.5v15l13-7.5Z" />
  </svg>
);

export const IconoMenu = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M2 4h12M2 8h12M2 12h7" />
  </svg>
);

export const IconoX = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m3.5 3.5 9 9M12.5 3.5l-9 9" />
  </svg>
);

/** Monograma NHC — minimalista, tipo Vercel: geometría plana, letras apretadas. */
export const LogoNHC = () => (
  <svg viewBox="0 0 48 48" width="100%" height="100%" role="img" aria-label="NoHayCupo">
    <text x="24" y="30.5" textAnchor="middle" fontSize="17" fontWeight="900"
      letterSpacing="-1.4" fill="#fff"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
      NHC
    </text>
  </svg>
);

export const IconoRefrescar = () => (
  <svg className="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6" />
  </svg>
);

export const IconoImagen = () => (
  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.7" cy="8.7" r="1.8" />
    <path d="m21 15.3-4.3-4.3L6 21.7" />
  </svg>
);

export const IconoCalendario = () => (
  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </svg>
);

export const IconoChispa = () => (
  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.5 13.8 9 19 11l-5.2 2-1.8 5.5L10.2 13 5 11l5.2-2Z" />
    <path d="M19 3.5v3M17.5 5h3" />
  </svg>
);

export const IconoImpresora = () => (
  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 8V3.5h11V8" />
    <rect x="3" y="8" width="18" height="9" rx="2.5" />
    <path d="M6.5 14.5h11v6h-11Z" />
  </svg>
);

export const IconoTabla = () => (
  <svg className="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M3 9.5h18M3 15.5h18M9.5 9.5V21M15.5 9.5V21" />
  </svg>
);

export const IconoCalendarioHero = () => (
  <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <rect x="6" y="9" width="36" height="33" rx="5" />
    <path d="M6 18h36M15 6v6M33 6v6" />
    <path d="m15 29 5 5 12-11" strokeWidth="3" />
  </svg>
);
