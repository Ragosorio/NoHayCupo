/** Modal de detalle de un curso: se abre al tocar una tarjeta del calendario
 * (fuera de modo edición). Muestra un mini-calendario del curso, toda la info
 * de cada componente (sección, horario, catedrático, auxiliar) y los grupos
 * de WhatsApp/Telegram de la comunidad para la sección mostrada. */
import { useStore } from "@nanostores/react";
import {
  cerrarDetalleCurso, detalleCursoActivo, seccionMostrada, setModal,
} from "@/lib/cliente/acciones";
import { $v, colorDe, E } from "@/lib/cliente/estado";
import { grupoDeSeccion } from "@/lib/cliente/grupos";
import { aMin, DIAS_NOMBRE, DIAS_ORDEN, DIAS_CORTO, nombreBonito } from "@/lib/cliente/util";
import { IconoAlerta, IconoTelegram, IconoWhatsapp } from "./Iconos";

function MiniCalendario({ codigo, componentes }: {
  codigo: string;
  componentes: { categoria: string; inicio: string; fin: string; dias: string[]; seccion: string }[];
}) {
  const [fondo, borde, tinta] = colorDe(codigo);
  const usados = new Set(componentes.flatMap((c) => c.dias));
  const dias = DIAS_ORDEN.filter((d) => usados.has(d));
  if (!dias.length) return null;
  const todos = componentes.flatMap((c) => [aMin(c.inicio), aMin(c.fin)]);
  const hIni = Math.floor(Math.min(...todos) / 60);
  const hFin = Math.ceil(Math.max(...todos) / 60);
  const px = 0.85;
  const alto = (hFin - hIni) * 60 * px;
  const y = (min: number) => (min - hIni * 60) * px;
  const horas: number[] = [];
  for (let h = hIni; h <= hFin; h++) horas.push(h);

  return (
    <div className="mini-cal" style={{ gridTemplateColumns: `34px repeat(${dias.length}, 1fr)` }}>
      <div />
      {dias.map((d) => <div key={d} className="mini-cal-head">{DIAS_CORTO[d]}</div>)}
      <div style={{ position: "relative", height: alto }}>
        {horas.map((h) => (
          <div key={h} className="mini-cal-hora" style={{ top: y(h * 60) }}>{h}</div>
        ))}
      </div>
      {dias.map((d) => (
        <div key={d} className="mini-cal-col" style={{ height: alto }}>
          {horas.map((h) => <div key={h} className="mini-cal-linea" style={{ top: y(h * 60) }} />)}
          {componentes.filter((c) => c.dias.includes(d)).map((c, i) => (
            <div key={i} className="mini-cal-bloque"
              style={{
                top: y(aMin(c.inicio)), height: Math.max(16, (aMin(c.fin) - aMin(c.inicio)) * px - 2),
                background: fondo, borderColor: borde, color: tinta,
              }}>
              {c.categoria === "Clase" ? c.seccion : (c.categoria === "Laboratorio" ? "LAB" : c.categoria.slice(0, 3))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ModalCurso() {
  useStore($v);
  const curso = detalleCursoActivo();
  if (!curso) return null;

  const comps = curso.opcion.componentes.map((c) => ({
    ...c, seccionVista: seccionMostrada(curso.codigo, c),
  }));
  // Grupos de todas las secciones mostradas del curso (normalmente la clase).
  const seccionesVistas = [...new Set(comps.map((c) => c.seccionVista))];
  const grupos = seccionesVistas
    .map((sec) => ({ sec, g: grupoDeSeccion(curso.codigo, sec) }))
    .filter((x) => x.g);

  return (
    <div className="modal-fondo no-print"
      onClick={(ev) => { if (ev.target === ev.currentTarget) cerrarDetalleCurso(); }}>
      <div className="modal-caja modal-curso">
        <header className="modal-header">
          <div>
            <h2>{curso.codigo} · {nombreBonito(curso.nombre)}</h2>
            <p className="modal-sub">{comps.length === 1 ? "1 componente" : `${comps.length} componentes`}</p>
          </div>
          <button className="btn btn-icono" title="Cerrar" onClick={cerrarDetalleCurso}>✕</button>
        </header>

        <div className="modal-curso-cuerpo">
          <MiniCalendario codigo={curso.codigo}
            componentes={comps.map((c) => ({ ...c, seccion: c.seccionVista }))} />

          <div className="curso-comps">
            {comps.map((c, i) => (
              <div key={i} className="curso-comp">
                <div className="curso-comp-top">
                  <strong>{c.categoria} · Sección {c.seccionVista}</strong>
                  {c.restringida && <span className="chip-restringida">restringida</span>}
                </div>
                <div className="curso-comp-linea">
                  {c.dias.map((d) => DIAS_NOMBRE[d]).join(", ")} · {c.inicio}–{c.fin}
                </div>
                <div className="curso-comp-linea">
                  <span className="curso-comp-rol">Catedrático:</span> {nombreBonito(c.catedratico) || "—"}
                </div>
                <div className="curso-comp-linea">
                  <span className="curso-comp-rol">Auxiliar:</span>{" "}
                  {c.auxiliar && c.auxiliar.toUpperCase() !== "SIN AUXILIAR"
                    ? nombreBonito(c.auxiliar) : "Sin auxiliar"}
                </div>
              </div>
            ))}
          </div>

          <div className="curso-grupos">
            <h3>Grupos de la sección</h3>
            {grupos.length ? grupos.map(({ sec, g }) => (
              <div key={sec} className="curso-grupos-fila">
                <span className="curso-grupos-sec">Sección {sec}</span>
                <div className="curso-grupos-btns">
                  {g!.whatsapp && (
                    <a className="btn btn-grupo grupo-wa" href={g!.whatsapp} target="_blank" rel="noopener noreferrer">
                      <IconoWhatsapp /> WhatsApp
                    </a>
                  )}
                  {g!.telegram && (
                    <a className="btn btn-grupo grupo-tg" href={g!.telegram} target="_blank" rel="noopener noreferrer">
                      <IconoTelegram /> Telegram
                    </a>
                  )}
                </div>
              </div>
            )) : (
              <p className="hint sin-margen">
                No hay canales disponibles para esta sección todavía.
              </p>
            )}

            <div className="curso-disclaimer">
              <IconoAlerta />
              <p>
                Los grupos los aporta la comunidad, <strong>no son oficiales</strong> y
                pueden tener errores o estar desactualizados. Si ves spam o algo raro,
                avisá por <a href="https://www.instagram.com/ragosorio" target="_blank" rel="noopener noreferrer">Instagram @ragosorio</a> y lo quitamos.
              </p>
            </div>

            <button className="btn btn-enlace" onClick={() => { cerrarDetalleCurso(); setModal("contribuir", true); }}>
              ¿Tenés el grupo de tu sección? Subilo — es fácil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
