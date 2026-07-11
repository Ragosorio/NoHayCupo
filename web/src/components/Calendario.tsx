/** El calendario semanal: eventos, bloqueos sombreados y ghosts del editor. */
import { useStore } from "@nanostores/react";
import {
  aplicarSwap, bloqueosComoRangos, comboMostrado, ghostsPara, seleccionarEnEditor,
  type CursoMostrado,
} from "@/lib/cliente/acciones";
import { $v, colorDe, E } from "@/lib/cliente/estado";
import { aMin, DIAS_NOMBRE, DIAS_ORDEN, nombreBonito } from "@/lib/cliente/util";

export function eventosDe(mostrado: CursoMostrado[]) {
  const eventos = [];
  for (const curso of mostrado) {
    const [fondo, borde, tinta] = colorDe(curso.codigo);
    for (const comp of curso.opcion.componentes) {
      for (const dia of comp.dias) {
        eventos.push({
          dia, inicio: aMin(comp.inicio), fin: aMin(comp.fin),
          codigo: curso.codigo, nombre: curso.nombre,
          seccion: comp.seccion, categoria: comp.categoria,
          catedratico: comp.catedratico, horas: `${comp.inicio}–${comp.fin}`,
          fondo, borde, tinta,
        });
      }
    }
  }
  return eventos;
}

export default function Calendario({ mostrado }: { mostrado: CursoMostrado[] }) {
  useStore($v);
  const eventos = eventosDe(mostrado);
  const bloqueos = bloqueosComoRangos();
  const usados = new Set(eventos.map((e) => e.dia));

  let ghosts: ReturnType<typeof ghostsPara> = [];
  if (E.editor?.seleccionado) {
    ghosts = ghostsPara(E.editor.seleccionado);
    for (const g of ghosts) g.componentes.forEach((c) => c.dias.forEach((d) => usados.add(d)));
  }

  const dias = DIAS_ORDEN.filter((d, i) => i < 5 || usados.has(d));
  const minEv = Math.min(...eventos.map((e) => e.inicio), 7 * 60);
  const maxEv = Math.max(...eventos.map((e) => e.fin), 14 * 60);
  const horaIni = Math.floor(minEv / 60);
  const horaFin = Math.ceil(maxEv / 60);
  const pxPorMin = 1.05;
  const alto = (horaFin - horaIni) * 60 * pxPorMin;
  const y = (min: number) => (min - horaIni * 60) * pxPorMin;
  const horas: number[] = [];
  for (let h = horaIni; h <= horaFin; h++) horas.push(h);

  const sel = E.editor?.seleccionado ?? null;
  let orden = 0;

  return (
    <div className="calendario">
      <div className="cal-grid" style={{ gridTemplateColumns: `56px repeat(${dias.length}, 1fr)` }}>
        <div />
        {dias.map((d) => (
          <div key={d} className={"cal-head" + (usados.has(d) ? "" : " hoy-libre")}>
            {DIAS_NOMBRE[d]}
          </div>
        ))}

        <div style={{ position: "relative", height: alto }}>
          {horas.map((h) => (
            <div key={h} className="cal-hora" style={{ position: "absolute", top: y(h * 60), right: 0 }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {dias.map((d) => {
          const delDia = eventos.filter((e) => e.dia === d);
          return (
            <div key={d} className="cal-col" style={{ height: alto }}>
              {horas.map((h) => (
                <div key={h} className="cal-linea" style={{ top: y(h * 60) }} />
              ))}
              {bloqueos.filter((b) => b.dia === d).map((b, i) => {
                const ini = Math.max(aMin(b.inicio), horaIni * 60);
                const fin = Math.min(aMin(b.fin), horaFin * 60);
                if (fin <= ini) return null;
                return (
                  <div key={`b${i}`} className={`cal-bloqueo ${b.nivel}`}
                    title={b.nivel === "imposible"
                      ? `Bloqueo «imposible» ${b.inicio}–${b.fin}`
                      : `Zona «mejor no» ${b.inicio}–${b.fin}`}
                    style={{ top: y(ini), height: (fin - ini) * pxPorMin }} />
                );
              })}
              {!delDia.length && !ghosts.length && (
                <div className="cal-dia-libre">libre</div>
              )}
              {delDia.map((e, i) => {
                const esLab = e.categoria !== "Clase";
                return (
                  <div key={`e${i}`}
                    className={"evento" + (esLab ? " lab" : "")
                      + (E.editor ? " editable" : "")
                      + (sel === e.codigo ? " seleccionado" : "")
                      + (sel && sel !== e.codigo ? " atenuado" : "")}
                    style={{
                      "--ev-fondo": e.fondo, "--ev-borde": e.borde, "--ev-tinta": e.tinta,
                      "--ev-raya": E.tema === "dark" ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.72)",
                      "--i": orden++,
                      top: y(e.inicio),
                      height: Math.max(24, (e.fin - e.inicio) * pxPorMin - 3),
                    } as React.CSSProperties}
                    title={`${e.codigo} ${nombreBonito(e.nombre)}\n${e.categoria} ${e.seccion} · ${e.horas}\n${nombreBonito(e.catedratico)}`
                      + (E.editor ? "\n(clic para ver a dónde se puede mover)" : "")}
                    onClick={E.editor ? () => seleccionarEnEditor(e.codigo) : undefined}>
                    {esLab && (
                      <span className="ev-tag">
                        {e.categoria === "Laboratorio" ? "LAB" : e.categoria.slice(0, 5).toUpperCase()}
                      </span>
                    )}
                    <div className="ev-curso">{e.codigo} · {e.seccion}</div>
                    <div className="ev-detalle">{e.horas}</div>
                    <div className="ev-detalle">{nombreBonito(e.nombre)}</div>
                  </div>
                );
              })}
              {ghosts.map((g, gi) =>
                g.componentes.filter((c) => c.dias.includes(d)).map((comp, ci) => {
                  const ini = aMin(comp.inicio), fin = aMin(comp.fin);
                  const [, borde] = colorDe(sel!);
                  return (
                    <div key={`g${gi}-${ci}`} className="ghost"
                      style={{
                        "--ev-borde": borde, "--i": orden++,
                        top: y(ini),
                        height: Math.max(22, (fin - ini) * pxPorMin - 3),
                      } as React.CSSProperties}
                      title={`Mover acá:\n${g.etiqueta}`}
                      onClick={() => aplicarSwap(sel!, g.id)}>
                      → {comp.seccion} <span style={{ opacity: .75 }}>{comp.inicio}</span>
                    </div>
                  );
                }))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
