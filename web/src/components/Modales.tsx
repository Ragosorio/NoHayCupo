/** Modales: pénsum, acerca de, bienvenida — y el toast. */
import { useStore } from "@nanostores/react";
import {
  alternarAprobado, creditosAprobados, cursosElegibles, setModal,
} from "@/lib/cliente/acciones";
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

export function Toast() {
  useStore($v);
  if (!E.toast) return null;
  return <div className="toast">{E.toast}</div>;
}

/** Bienvenida de algunos temas: una pelota que cruza la cancha (fútbol) o la
 * cinta de peligro anti-aburrimiento (USAC). Se autodestruye a los ~3 s. */
export function AnimacionTema() {
  useStore($v);
  if (!E.animTema) return null;
  if (E.animTema === "futbol") {
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
  }
  const aviso = "PELIGRO · ABURRIMIENTO DETECTADO · GENERANDO HORARIO DE EMERGENCIA · ";
  return (
    <div className="anim-tema" aria-hidden="true">
      <div className="anim-cinta"><span>{aviso.repeat(6)}</span></div>
    </div>
  );
}
