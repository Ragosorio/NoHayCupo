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
import { IconoPlay, LogoNHC } from "./Iconos";

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
    default:
      return null;
  }
}
