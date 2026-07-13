/** Modales: pénsum, acerca de, bienvenida, compartir — toast y animaciones. */
import { useStore } from "@nanostores/react";
import { useState } from "react";
import {
  alternarAprobado, creditosAprobados, cursosElegibles, setModal,
} from "@/lib/cliente/acciones";
import { compartirHorario } from "@/lib/cliente/compartir";
import { $v, E } from "@/lib/cliente/estado";
import { iniciarTour } from "@/lib/cliente/tour";
import { ORDINAL_SEM } from "@/lib/cliente/util";
import { IconoAlerta, IconoPlay, LogoNHC } from "./Iconos";

export function ModalPensum() {
  useStore($v);
  if (!E.modalPensum || !E.pensum) return null;
  const elegibles = new Set(cursosElegibles().map((c) => c.codigo));
  const meta = E.indicePensums.find((p) => p.id === E.pensumId);

  return (
    <div className="modal-fondo no-print"
      onClick={(ev) => { if (ev.target === ev.currentTarget) setModal("pensum", false); }}>
      <div className="modal-caja">
        <header className="modal-header">
          <div>
            <h2>Mi pénsum — {meta?.carrera ?? ""}</h2>
            <p className="modal-sub">{E.pensumInfo}</p>
          </div>
          <div className="modal-header-der">
            <div className="modal-stats">
              <div className="stat-chip"><strong>{E.aprobados.size}/{E.pensum.length}</strong>aprobados</div>
              <div className="stat-chip"><strong>{creditosAprobados()}</strong>créditos</div>
              <div className="stat-chip"><strong>{elegibles.size}</strong>podés llevar</div>
            </div>
            <button className="btn btn-icono" title="Cerrar" onClick={() => setModal("pensum", false)}>✕</button>
          </div>
        </header>
        <div className="modal-leyenda">
          <span className="leyenda-item aprobado">✓ aprobado</span>
          <span className="leyenda-item elegible">podés llevarlo</span>
          <span className="leyenda-item bloqueado">prerrequisitos pendientes</span>
          <span className="leyenda-item sinoferta">⊘ sin oferta este semestre</span>
        </div>
        <div className="pensum-grid">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((sem) => {
            const cursos = E.pensum!.filter((c) => c.semestre === sem);
            if (!cursos.length) return null;
            return (
              <div key={sem} className="pensum-col">
                <div className="pensum-col-titulo">
                  <span className="num">{sem}</span>{ORDINAL_SEM[sem]} semestre
                </div>
                {cursos.map((c) => {
                  const aprobado = E.aprobados.has(c.codigo);
                  const elegible = elegibles.has(c.codigo);
                  const sinOferta = !!E.catalogo && !E.porCodigo.has(c.codigo);
                  const faltantes = c.prerrequisitos.filter((p) => !E.aprobados.has(p));
                  return (
                    <label key={c.codigo}
                      className={"pensum-curso"
                        + (aprobado ? " aprobado" : elegible ? " elegible" : " bloqueado")
                        + (sinOferta && !aprobado ? " sinoferta" : "")}
                      title={c.prerrequisitos.length
                        ? `Prerrequisitos: ${c.prerrequisitos.join(", ")}` : "Sin prerrequisitos"}>
                      <input type="checkbox" checked={aprobado}
                        onChange={(ev) => alternarAprobado(c.codigo, ev.target.checked)} />
                      <div className="pc-info">
                        <div className="pc-linea1">
                          <span className="pc-codigo">{c.codigo}</span>
                          <span className="pc-cred">{c.creditos} cr</span>
                        </div>
                        <div className="pc-nombre">{c.nombre}</div>
                        {!aprobado && faltantes.length > 0 && (
                          <div className="pc-prereq">falta: {faltantes.join(", ")}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ModalAcerca() {
  useStore($v);
  if (!E.modalAcerca) return null;
  return (
    <div className="modal-fondo no-print"
      onClick={(ev) => { if (ev.target === ev.currentTarget) setModal("acerca", false); }}>
      <div className="acerca-caja">
        <button className="btn btn-icono acerca-cerrar" title="Cerrar"
          onClick={() => setModal("acerca", false)}>✕</button>
        <div className="acerca-head">
          <div className="brand-mark grande"><LogoNHC /></div>
          <h2>NoHayCupo</h2>
          <p className="acerca-desc">
            Arma <strong>todas</strong> las combinaciones de horario posibles de FIUSAC,
            respeta las horas que no querés usar y te deja ajustar el resultado a mano.
            Sin cuentas, sin guardar nada fuera de tu navegador.
          </p>
          <button className="btn-enlace"
            onClick={() => { setModal("acerca", false); iniciarTour(); }}>
            <IconoPlay /> ver el tour de la página
          </button>
          <button className="btn-enlace"
            onClick={() => { setModal("acerca", false); setModal("contribuir", true); }}>
            <IconoAlerta /> ¿cómo subir un grupo de WhatsApp/Telegram?
          </button>
        </div>
        <div className="acerca-autor">
          <span className="acerca-eyebrow">Autor</span>
          <div className="acerca-autor-fila">
            <img className="acerca-avatar" src="/rago.jpg" alt="Foto de Rolando Osorio" />
            <div>
              <div className="acerca-nombre">Rolando Osorio · <span className="acerca-alias">ragosorio</span></div>
              <p className="acerca-bio">
                Estudiante de Ingeniería en Ciencias y Sistemas, USAC. Si querés
                escribirme algo del proyecto, que sea por Instagram.
              </p>
            </div>
          </div>
          <div className="acerca-links">
            <a className="btn acerca-link" href="https://www.instagram.com/ragosorio" target="_blank" rel="noopener">
              <img className="icono-red" src="/icons/instagram.svg" alt="" /> Instagram
            </a>
            <a className="btn acerca-link" href="https://www.tiktok.com/@ragosorio" target="_blank" rel="noopener">
              <img className="icono-red icono-tiktok" src="/icons/tiktok.svg" alt="" /> TikTok
            </a>
            <a className="btn acerca-link" href="https://github.com/ragosorio" target="_blank" rel="noopener">
              <img className="icono-red icono-github" src="/icons/github.svg" alt="" /> GitHub
            </a>
            <a className="btn acerca-link" href="https://ragosorio.com/" target="_blank" rel="noopener">
              <img className="icono-red" src="/icons/ragosorio.svg" alt="" /> ragosorio.com
            </a>
          </div>
          <a className="acerca-repo" href="https://github.com/Ragosorio/NoHayCupo" target="_blank" rel="noopener">
            <span>Proyecto open source — estrellitas bienvenidas</span>
            <strong>github.com/Ragosorio/NoHayCupo →</strong>
          </a>
          <p className="acerca-amor">
            Hecho con <span className="corazon">❤</span> por <strong>ragosorio</strong> para
            la USAC — que esta vez sí haya cupo.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ModalBienvenida() {
  useStore($v);
  if (!E.modalBienvenida) return null;
  const cerrar = (tour: boolean) => {
    localStorage.setItem("nhc_visto", "1");
    setModal("bienvenida", false);
    if (tour) iniciarTour();
  };
  return (
    <div className="modal-fondo no-print">
      <div className="bienvenida-caja">
        <div className="brand-mark grande"><LogoNHC /></div>
        <h2>¿Primera vez por acá?</h2>
        <p>
          NoHayCupo arma <strong>todas</strong> las combinaciones de horario posibles
          con los cursos que elijás, respeta las horas que no querés usar, y te deja
          ajustar el resultado a mano.
        </p>
        <div className="bienvenida-botones">
          <button className="btn btn-primary" onClick={() => cerrar(true)}>Sí, dame el tour</button>
          <button className="btn" onClick={() => cerrar(false)}>Ya la conozco</button>
        </div>
      </div>
    </div>
  );
}

export function ModalCompartir() {
  useStore($v);
  const [apodo, setApodo] = useState("");
  if (!E.modalCompartir) return null;
  return (
    <div className="modal-fondo no-print"
      onClick={(ev) => { if (ev.target === ev.currentTarget) setModal("compartir", false); }}>
      <div className="bienvenida-caja compartir-caja">
        <h2>Armar horario con amigos</h2>
        <p>
          Se copia una invitación con <strong>tu horario actual</strong> (cursos y
          secciones). Tu amigo la abre, arma su propia versión, y la app les marca
          en qué clases coinciden. Sin cuentas: todo viaja en el link.
        </p>
        <label className="campo campo-grande compartir-campo">
          <span>Tu apodo <em>(así te va a ver tu amigo)</em></span>
          <input type="text" maxLength={24} placeholder="ej. El de Física" autoComplete="off"
            value={apodo} onChange={(ev) => setApodo(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") compartirHorario(apodo); }} />
        </label>
        <div className="bienvenida-botones">
          <button className="btn btn-primary" onClick={() => compartirHorario(apodo)}>
            Copiar invitación
          </button>
          <button className="btn" onClick={() => setModal("compartir", false)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  useStore($v);
  if (!E.toast) return null;
  return <div className="toast">{E.toast}</div>;
}

/** Bienvenidas de los temas: cada tema con `animacion` tiene su rama acá.
 * Duran ~3 s (timer en cambiarTema) y son solo decorativas: el overlay es
 * pointer-events:none y prefers-reduced-motion las apaga por CSS. */
export function AnimacionTema() {
  useStore($v);
  switch (E.animTema) {
    case "futbol":
      return (
        <div className="anim-tema" aria-hidden="true">
          <svg className="anim-pelota" viewBox="0 0 100 100" width="70" height="70">
            <circle cx="50" cy="50" r="47" fill="#fff" stroke="#1a1a1a" strokeWidth="5" />
            <polygon points="50,32 66,44 60,63 40,63 34,44" fill="#1a1a1a" />
            <path d="M50 32 50 8M66 44l22-8M60 63l14 19M40 63 26 82M34 44 12 36"
              stroke="#1a1a1a" strokeWidth="5" fill="none" />
          </svg>
          <div className="anim-grito">¡GOOOL DE HORARIO!</div>
        </div>
      );
    case "usac": {
      const aviso = "PELIGRO · ABURRIMIENTO DETECTADO · GENERANDO HORARIO DE EMERGENCIA · ";
      return (
        <div className="anim-tema" aria-hidden="true">
          <div className="anim-cinta"><span>{aviso.repeat(6)}</span></div>
        </div>
      );
    }
    case "cute":
      return (
        <div className="anim-tema" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <svg key={i} className="anim-flor" viewBox="0 0 24 24" width="26" height="26"
              style={{ "--x": `${8 + i * 10.5}%`, "--d": `${i * 0.18}s` } as React.CSSProperties}>
              {i % 2 === 0 ? (
                <>
                  {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx="12" cy="7.8" rx="2.6" ry="3.4" fill="#f0a8d8"
                      transform={`rotate(${a} 12 12)`} />
                  ))}
                  <circle cx="12" cy="12" r="2.6" fill="#a21caf" />
                </>
              ) : (
                <path d="M12 20 5.6 13.4a4.1 4.1 0 0 1 5.8-5.8l.6.6.6-.6a4.1 4.1 0 0 1 5.8 5.8Z" fill="#e879ba" />
              )}
            </svg>
          ))}
          {/* El ajolote: se asoma desde abajo, saluda y se esconde. */}
          <svg className="anim-ajolote" viewBox="0 0 120 90" width="150" height="112">
            <g stroke="#e8739f" strokeWidth="5" strokeLinecap="round">
              <path d="M32 38c-8-2-14-8-15-15M35 28c-6-4-9-10-9-17M45 22c-3-5-3-11-1-16" fill="none" />
              <path d="M88 38c8-2 14-8 15-15M85 28c6-4 9-10 9-17M75 22c3-5 3-11 1-16" fill="none" />
            </g>
            <ellipse cx="60" cy="55" rx="42" ry="36" fill="#f7b1cd" />
            <circle cx="46" cy="48" r="4.5" fill="#3b1b44" />
            <circle cx="74" cy="48" r="4.5" fill="#3b1b44" />
            <circle cx="47.5" cy="46.5" r="1.5" fill="#fff" />
            <circle cx="75.5" cy="46.5" r="1.5" fill="#fff" />
            <path d="M50 62q10 8 20 0" stroke="#3b1b44" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="38" cy="58" r="5" fill="#f48fb8" />
            <circle cx="82" cy="58" r="5" fill="#f48fb8" />
          </svg>
        </div>
      );
    case "campeon":
      return (
        <div className="anim-tema" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="anim-papelito"
              style={{
                "--x": `${4 + i * 7}%`, "--d": `${(i % 5) * 0.22}s`,
                background: ["#75aadb", "#ffffff", "#d4a017"][i % 3],
              } as React.CSSProperties} />
          ))}
          <svg className="anim-copa" viewBox="0 0 100 130" width="110" height="143">
            <path d="M30 14h40v10c0 16-8 28-20 32-12-4-20-16-20-32Z" fill="#d4a017" />
            <path d="M30 18H16c0 14 6 22 16 24M70 18h14c0 14-6 22-16 24" fill="none" stroke="#d4a017" strokeWidth="6" />
            <path d="M46 56h8l3 22H43Z" fill="#b8860b" />
            <rect x="34" y="78" width="32" height="12" rx="3" fill="#d4a017" />
            <rect x="28" y="90" width="44" height="14" rx="4" fill="#b8860b" />
            <text x="50" y="122" textAnchor="middle" fontSize="20" fontWeight="900"
              fill="#75aadb" fontFamily="system-ui, sans-serif">10</text>
          </svg>
          <div className="anim-grito anim-grito-campeon">¡CAMPEONES!</div>
        </div>
      );
    case "siu":
      return (
        <div className="anim-tema" aria-hidden="true">
          <div className="anim-siete">7</div>
          {/* Silueta del salto: brazos abajo, pecho afuera. */}
          <svg className="anim-salto" viewBox="0 0 100 140" width="100" height="140">
            <g fill="#0d0507">
              <circle cx="50" cy="18" r="11" />
              <path d="M50 30c11 0 16 8 16 20l-3 26h-26l-3-26c0-12 5-20 16-20Z" />
              <path d="M36 36 20 62l7 5 14-20M64 36l16 26-7 5-14-20" />
              <path d="M42 76 34 116l9 2 9-30 9 30 9-2-8-40Z" />
            </g>
          </svg>
          <div className="anim-grito anim-grito-siu">¡SIUUUU!</div>
        </div>
      );
    case "dtmf":
      return (
        <div className="anim-tema anim-fondo-dtmf" aria-hidden="true">
          <svg className="anim-corazon-roto" viewBox="0 0 100 100" width="120" height="120">
            <path className="mitad-izq" d="M49 88 14 52a20 20 0 0 1 28-28l7 7v57Z" fill="#e5484d" />
            <path className="mitad-der" d="M51 88l35-36a20 20 0 0 0-28-28l-7 7v57Z" fill="#e5484d" />
          </svg>
          <div className="anim-grito anim-grito-dtmf">DEBÍ TIRAR MÁS FOTOS</div>
        </div>
      );
    case "colombia":
      return (
        <div className="anim-tema" aria-hidden="true">
          {[["#fcd116", "30%", "9vh", "0s"], ["#1a4fa0", "42%", "4.5vh", ".18s"], ["#ce1126", "49%", "4.5vh", ".36s"]].map(([c, y, h, d], i) => (
            <span key={i} className="anim-banda"
              style={{ "--c": c, top: y, height: h, "--d": d } as React.CSSProperties} />
          ))}
          <div className="anim-grito anim-grito-colombia">¡DALE COLOMBIA!</div>
        </div>
      );
    case "francia":
      return (
        <div className="anim-tema" aria-hidden="true">
          <svg className="anim-torre" viewBox="0 0 100 160" width="110" height="176">
            <g fill="#131c33">
              <path d="M50 6 38 74h8l4-40 4 40h8Z" />
              <path d="M34 74h32l-4 8H38Z" />
              <path d="M40 82 22 146h10l18-52 18 52h10L60 82Z" />
              <path d="M30 118q20 12 40 0l2 8q-22 12-44 0Z" />
            </g>
          </svg>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="anim-estrella"
              style={{ left: `${18 + i * 13}%`, top: `${14 + (i % 3) * 12}%`, "--d": `${0.4 + i * 0.22}s` } as React.CSSProperties} />
          ))}
          <div className="anim-grito anim-grito-francia">ALLEZ LES BLEUS</div>
        </div>
      );
    case "noruega":
      return (
        <div className="anim-tema" aria-hidden="true">
          {[["#3ddc97", "10%", "0s"], ["#35d0e0", "22%", ".35s"], ["#8b5cf6", "33%", ".7s"]].map(([c, y, d], i) => (
            <svg key={i} className="anim-aurora" viewBox="0 0 400 60" preserveAspectRatio="none"
              style={{ top: y, "--d": d } as React.CSSProperties}>
              <path d="M0 40Q60 8 120 32T240 28T400 18" stroke={c as string} strokeWidth="14"
                fill="none" strokeLinecap="round" opacity=".55" />
            </svg>
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="anim-estrella"
              style={{ left: `${6 + i * 12}%`, top: `${46 + (i % 4) * 9}%`, "--c": "#ecf1fa", "--d": `${i * 0.2}s` } as React.CSSProperties} />
          ))}
          <div className="anim-grito anim-grito-noruega">AURORA BOREAL</div>
        </div>
      );
    case "suecia":
      return (
        <div className="anim-tema" aria-hidden="true">
          <span className="anim-cruz-h" />
          <span className="anim-cruz-v" />
          <div className="anim-grito anim-grito-suecia">HEJA SVERIGE</div>
        </div>
      );
    case "mexico":
      return (
        <div className="anim-tema" aria-hidden="true">
          {Array.from({ length: 15 }, (_, i) => (
            <span key={i} className="anim-papelito"
              style={{
                "--x": `${4 + i * 6.5}%`, "--d": `${(i % 5) * 0.2}s`,
                background: ["#046a38", "#ffffff", "#ce1126"][i % 3],
              } as React.CSSProperties} />
          ))}
          <div className="anim-grito anim-grito-mexico">¡VIVA MÉXICO!</div>
        </div>
      );
    case "caboverde":
      return (
        <div className="anim-tema" aria-hidden="true">
          <div className="anim-rueda-estrellas">
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i * 36 * Math.PI) / 180;
              return (
                <span key={i} className="anim-isla-estrella"
                  style={{
                    left: `calc(50% + ${Math.cos(a) * 90}px)`,
                    top: `calc(50% + ${Math.sin(a) * 90}px)`,
                    "--d": `${0.2 + i * 0.12}s`,
                  } as React.CSSProperties} />
              );
            })}
          </div>
          <div className="anim-mar anim-mar-cv" />
          <div className="anim-grito anim-grito-caboverde">MORABEZA</div>
        </div>
      );
    case "vikingo":
      return (
        <div className="anim-tema" aria-hidden="true">
          <div className="anim-siete anim-nueve">9</div>
          {/* La silueta meditando: la celebración zen. */}
          <svg className="anim-zen" viewBox="0 0 120 100" width="130" height="108">
            <g fill="#08121a">
              <circle cx="60" cy="22" r="12" />
              <path d="M60 36c14 0 22 10 22 24l-4 14H42l-4-14c0-14 8-24 22-24Z" />
              <path d="M38 48 18 66l6 8 20-14M82 48l20 18-6 8-20-14" />
              <path d="M34 74q26 14 52 0l6 10q-32 16-64 0Z" />
            </g>
          </svg>
          <div className="anim-grito anim-grito-vikingo">ZEN NÓRDICO</div>
        </div>
      );
    case "chapin":
      return (
        <div className="anim-tema" aria-hidden="true">
          {/* El quetzal cruza volando con su cola larga. */}
          <svg className="anim-quetzal" viewBox="0 0 220 90" width="240" height="98">
            <path d="M10 78Q60 84 96 62" stroke="#1f7a3d" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M4 66Q58 74 96 56" stroke="#2f9e5f" strokeWidth="4" fill="none" strokeLinecap="round" />
            <ellipse cx="118" cy="46" rx="26" ry="16" fill="#1f7a3d" />
            <path d="M112 34q14-18 34-14-8 12-18 16" fill="#2f9e5f" />
            <circle cx="140" cy="38" r="10" fill="#1f7a3d" />
            <circle cx="143.5" cy="36" r="1.8" fill="#0c0b09" />
            <path d="M149 38.5 158 41l-9 2.5Z" fill="#e8b422" />
            <path d="M112 52q10 8 22 4" fill="none" stroke="#c8102e" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div className="anim-grito anim-grito-chapin">¡PURO CHAPÍN!</div>
        </div>
      );
    case "playero":
      return (
        <div className="anim-tema" aria-hidden="true">
          <div className="anim-mar" />
          <svg className="anim-sol" viewBox="0 0 100 100" width="110" height="110">
            <circle cx="50" cy="50" r="46" fill="#f0a24c" />
            <circle cx="50" cy="50" r="34" fill="#f5b96e" />
          </svg>
          <svg className="anim-corazon-vuela" viewBox="0 0 100 100" width="72" height="72">
            <path d="M50 86 15 51a20 20 0 0 1 28-28l7 7 7-7a20 20 0 0 1 28 28Z" fill="#e5484d" />
            <path d="m50 30-8 14 13 10-9 16" fill="none" stroke="#fdf4e7" strokeWidth="4" strokeLinejoin="round" />
          </svg>
          <div className="anim-grito anim-grito-playero">UN VERANO SIN CUPO</div>
        </div>
      );
    case "psicodelico":
      return (
        <div className="anim-tema" aria-hidden="true">
          {["#7c3aed", "#0284c7", "#4caf50", "#f0b429", "#e5484d"].map((c, i) => (
            <span key={c} className="anim-anillo"
              style={{ "--c": c, "--d": `${i * 0.16}s` } as React.CSSProperties} />
          ))}
        </div>
      );
    case "estrellada":
      return (
        <div className="anim-tema" aria-hidden="true">
          {[["14%", "18%", 1.1], ["46%", "8%", 1.5], ["74%", "22%", 0.9]].map(([x, y, s], i) => (
            <svg key={i} className="anim-remolino" viewBox="0 0 60 60" width={64 * (s as number)} height={64 * (s as number)}
              style={{ left: x as string, top: y as string, "--d": `${i * 0.3}s` } as React.CSSProperties}>
              <path d="M8 32c4-12 18-14 25-6 5 6 2 13-4 14-5 1-8-3-6-7"
                stroke="#f0c53f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </svg>
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="anim-estrella"
              style={{ left: `${10 + i * 12}%`, top: `${18 + (i % 3) * 16}%`, "--d": `${i * 0.2}s` } as React.CSSProperties} />
          ))}
        </div>
      );
    case "pandora":
      return (
        <div className="anim-tema" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <svg key={i} className="anim-espora" viewBox="0 0 20 20" width="18" height="18"
              style={{ "--x": `${5 + i * 9.5}%`, "--d": `${(i % 5) * 0.3}s` } as React.CSSProperties}>
              <circle cx="10" cy="10" r="4" fill="#35d0e0" opacity=".9" />
              <path d="M10 2v4M10 14v4M2 10h4M14 10h4" stroke="#35d0e0" strokeWidth="1.2" opacity=".6" />
            </svg>
          ))}
        </div>
      );
    case "pasarela":
      return (
        <div className="anim-tema" aria-hidden="true">
          <div className="anim-brillo" />
          <div className="anim-grito anim-grito-pasarela">LUJO SILENCIOSO</div>
        </div>
      );
    case "atrapalos":
      return (
        <div className="anim-tema" aria-hidden="true">
          <svg className="anim-esfera" viewBox="0 0 100 100" width="90" height="90">
            <circle cx="50" cy="50" r="46" fill="#fff" stroke="#241c1c" strokeWidth="6" />
            <path d="M4 50a46 46 0 0 1 92 0Z" fill="#cc2b2b" />
            <path d="M4 50h92" stroke="#241c1c" strokeWidth="6" />
            <circle cx="50" cy="50" r="13" fill="#fff" stroke="#241c1c" strokeWidth="6" />
          </svg>
          <span className="anim-destello" />
          <div className="anim-grito anim-grito-atrapalos">¡HORARIO ATRAPADO!</div>
        </div>
      );
    case "nivel11":
      return (
        <div className="anim-tema" aria-hidden="true">
          <svg className="anim-bloque" viewBox="0 0 60 60" width="76" height="76">
            <rect x="2" y="2" width="56" height="56" fill="#f0b429" stroke="#8a5a00" strokeWidth="4" />
            <text x="30" y="42" textAnchor="middle" fontSize="34" fontWeight="900"
              fill="#8a5a00" fontFamily="system-ui, sans-serif">?</text>
          </svg>
          <svg className="anim-moneda" viewBox="0 0 40 40" width="44" height="44">
            <ellipse cx="20" cy="20" rx="14" ry="18" fill="#f7d354" stroke="#8a5a00" strokeWidth="3" />
            <ellipse cx="20" cy="20" rx="5" ry="10" fill="none" stroke="#8a5a00" strokeWidth="3" />
          </svg>
          <div className="anim-grito anim-grito-nivel">¡NIVEL 1-1!</div>
        </div>
      );
    case "rosadito":
      return (
        <div className="anim-tema" aria-hidden="true">
          {/* Las grietas: la pantalla "se rompe" para entrar al mundo rosa. */}
          <svg className="anim-grietas" viewBox="0 0 200 200" width="min(70vw, 460px)" height="min(70vw, 460px)">
            <g stroke="#d13472" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M100 100 62 55M100 100l52-38M100 100l-58 30M100 100l44 52M100 100 88 36M100 100l24 -8M100 100l-30 -6" />
              <path d="M62 55l-14-8M152 62l16-4M42 130l-16 10M144 152l10 14" strokeWidth="2" />
            </g>
          </svg>
          <svg className="anim-bolita" viewBox="0 0 120 120" width="130" height="130">
            <g className="bolita-mazo">
              <rect x="86" y="8" width="14" height="34" rx="4" fill="#8a5a3b" transform="rotate(28 93 25)" />
              <rect x="74" y="0" width="38" height="20" rx="7" fill="#c8102e" transform="rotate(28 93 10)" />
            </g>
            <circle cx="52" cy="66" r="38" fill="#f7a8c4" />
            <circle cx="40" cy="58" r="5.5" fill="#3d2030" />
            <circle cx="64" cy="58" r="5.5" fill="#3d2030" />
            <circle cx="41.8" cy="56" r="1.8" fill="#fff" />
            <circle cx="65.8" cy="56" r="1.8" fill="#fff" />
            <circle cx="31" cy="72" r="6" fill="#ef7fa8" />
            <circle cx="73" cy="72" r="6" fill="#ef7fa8" />
            <path d="M44 76q8 7 16 0" stroke="#3d2030" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      );
    case "gallo":
      return (
        <div className="anim-tema" aria-hidden="true">
          <svg className="anim-tarro" viewBox="0 0 100 120" width="100" height="120">
            <path d="M22 34h48v72a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8Z" fill="#e8b422" />
            <path d="M70 44h10a12 12 0 0 1 0 24H70" fill="none" stroke="#e8b422" strokeWidth="7" />
            <path d="M30 44v56M44 44v56M58 44v56" stroke="#c9971a" strokeWidth="4" />
            <g className="tarro-espuma">
              <ellipse cx="46" cy="34" rx="26" ry="10" fill="#f7f0dc" />
              <circle cx="30" cy="26" r="7" fill="#f7f0dc" />
              <circle cx="47" cy="22" r="9" fill="#f7f0dc" />
              <circle cx="63" cy="27" r="6.5" fill="#f7f0dc" />
            </g>
          </svg>
          <div className="anim-grito anim-grito-gallo">¡SALUD, COMPA!</div>
        </div>
      );
    case "burbujas":
      return (
        <div className="anim-tema" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <svg key={i} className="anim-gas" viewBox="0 0 20 20" width={10 + (i % 4) * 5} height={10 + (i % 4) * 5}
              style={{ "--x": `${4 + i * 8}%`, "--d": `${(i % 6) * 0.22}s` } as React.CSSProperties}>
              <circle cx="10" cy="10" r="8" fill="none" stroke="#c8102e" strokeWidth="2.4" opacity=".75" />
              <circle cx="7" cy="7" r="2" fill="#c8102e" opacity=".5" />
            </svg>
          ))}
          <div className="anim-grito anim-grito-burbujas">QUÉ REFRESCANTE</div>
        </div>
      );
    case "chasquido":
      return (
        <div className="anim-tema" aria-hidden="true">
          {[["#7c3aed", "26%"], ["#0284c7", "35%"], ["#4caf50", "44%"], ["#f0b429", "53%"], ["#e5484d", "62%"], ["#f97316", "71%"]].map(([c, x], i) => (
            <span key={i} className="anim-gema"
              style={{ "--c": c, left: x, "--d": `${i * 0.14}s` } as React.CSSProperties} />
          ))}
          <span className="anim-destello anim-destello-tarde" />
          {Array.from({ length: 10 }, (_, i) => (
            <span key={`p${i}`} className="anim-polvo"
              style={{ left: `${8 + i * 9}%`, top: `${30 + (i % 4) * 12}%`, "--d": `${1.2 + (i % 5) * 0.15}s` } as React.CSSProperties} />
          ))}
          <div className="anim-grito anim-grito-chasquido">CHASQUIDO.</div>
        </div>
      );
    default:
      return null;
  }
}
