/** Panel de cursos: buscador con dropdown + chips con secciones restringidas. */
import { useStore } from "@nanostores/react";
import { useRef, useState } from "react";
import {
  agregarCurso, alternarRestringida, buscarCursos, etiquetaComponentes, quitarCurso,
} from "@/lib/cliente/acciones";
import { $v, E, paleta } from "@/lib/cliente/estado";
import { nombreBonito } from "@/lib/cliente/util";

const ICONO_VEREDICTO: Record<string, string> = { aplica: "✓", no_aplica: "✗", revisar: "?" };

function ChipCurso({ codigo, idx }: { codigo: string; idx: number }) {
  const curso = E.porCodigo.get(codigo);
  if (!curso) return null;
  const [, borde] = paleta()[idx % paleta().length];
  const restringidas = curso.secciones.filter((s) => s.restringida);
  const marcadas = E.restringidas[codigo] ?? new Set<string>();
  const verdictos = E.restric[codigo] ?? {};

  const badges: React.ReactNode[] = [];
  const comps = etiquetaComponentes(curso);
  if (comps) {
    const n = (curso.tiene_clase ? 1 : 0) + curso.componentes_practicos.length;
    badges.push(
      <span key="dual" className="mini-badge dual"
        title={`Este curso se inscribe como ${n} componentes con horarios separados. La app garantiza que no choquen entre sí ni con el resto.`}>
        {comps} · {n} horarios
      </span>);
  }
  if (restringidas.length) {
    badges.push(<span key="restr" className="mini-badge warn">{restringidas.length} restringidas</span>);
  }
  const enPensum = E.pensumPorCodigo.get(codigo);
  if (enPensum) {
    const faltan = enPensum.prerrequisitos.filter((p) => !E.aprobados.has(p));
    if (faltan.length) {
      badges.push(
        <span key="prereq" className="mini-badge warn"
          title={`Según la red de estudios te falta aprobar: ${faltan.join(", ")}`}>
          falta prerreq. {faltan.join(", ")}
        </span>);
    }
  }

  return (
    <li className="curso-chip" style={{ "--color": borde } as React.CSSProperties}>
      <div className="curso-chip-fila">
        <span className="codigo">{curso.codigo}</span>
        <span className="nombre">{nombreBonito(curso.nombre)}</span>
        <button className="quitar" title="Quitar curso" onClick={() => quitarCurso(codigo)}>×</button>
      </div>
      {badges.length > 0 && <div className="badges">{badges}</div>}
      {restringidas.length > 0 && (
        <details className="restringidas-det">
          <summary>
            Secciones «Ver Restricciones» — {marcadas.size}/{restringidas.length} habilitadas
          </summary>
          <div className="lista-restr">
            {!E.carnet && (
              <p className="hint sin-margen">
                Escribí tu carnet arriba y estas se verifican solas. También podés marcarlas a mano.
              </p>
            )}
            {restringidas.map((s) => {
              const info = verdictos[s.seccion];
              return (
                <label key={s.seccion} className={"restr-item" + (info ? ` v-${info.veredicto}` : "")}>
                  <input type="checkbox" checked={marcadas.has(s.seccion)}
                    onChange={(ev) => alternarRestringida(codigo, s.seccion, ev.target.checked)} />
                  {info && (
                    <span className="restr-icono" title={info.detalle.join("\n")}>
                      {ICONO_VEREDICTO[info.veredicto]}
                    </span>
                  )}
                  <span className="restr-texto">
                    <span className="sec">{s.seccion}</span>
                    {s.categoria ? ` · ${s.categoria}` : ""} — {s.dias.join(" ")} {s.inicio}–{s.fin} · {nombreBonito(s.catedratico)}
                    {info && info.veredicto !== "aplica" && (
                      <span className="restr-detalle">{info.detalle.join(" · ")}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      )}
    </li>
  );
}

export default function PanelCursos() {
  useStore($v);
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const items = abierto ? buscarCursos(consulta) : [];
  const sinCatalogo = !E.catalogo || E.catalogo.total_cursos === 0;

  const elegir = (codigo: string) => {
    agregarCurso(codigo);
    setConsulta("");
    setAbierto(false);
  };

  return (
    <section className="panel" id="panelCursos">
      <h2>Cursos <span className="h2-cont">{E.seleccion.length || ""}</span></h2>
      <div className="buscador">
        <input type="search" placeholder="Código o nombre… ej. 0768" autoComplete="off"
          disabled={sinCatalogo}
          value={consulta}
          onChange={(ev) => { setConsulta(ev.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setAbierto(false), 150); }}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && items.length) elegir(items[0].codigo);
            if (ev.key === "Escape") setAbierto(false);
          }} />
        <ul className="resultados-busqueda" hidden={items.length === 0}>
          {items.map((c) => {
            const comps = etiquetaComponentes(c);
            return (
              <li key={c.codigo}
                onMouseDown={(ev) => { ev.preventDefault(); elegir(c.codigo); }}>
                <span className="codigo">{c.codigo}</span>
                <span className="nombre">{nombreBonito(c.nombre)}</span>
                <span className="meta">
                  {c.num_secciones} secc{comps ? ` · ${comps.toLowerCase()}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="cursos-seleccionados">
        {E.seleccion.map((codigo, idx) => <ChipCurso key={codigo} codigo={codigo} idx={idx} />)}
      </ul>
      {E.seleccion.length === 0 && (
        <p className="hint">Buscá y agregá lo que querés llevar. Los laboratorios entran solos con su clase.</p>
      )}
    </section>
  );
}
