/** Constructor de horario para el modo «ya tengo mi horario».
 *
 * En vez de rankear, deja al estudiante elegir la sección exacta de cada curso.
 * El buscador NO busca en todo el catálogo: filtra las secciones de los cursos
 * que ya tiene puestos. Escribir «a» muestra la sección A de cada curso; también
 * filtra por catedrático o día. Reusa el motor: cada opción sale de
 * `res.opciones[codigo]` (ya calculadas). Los cursos se agregan desde el panel
 * de la izquierda.
 */
import { useStore } from "@nanostores/react";
import { useState } from "react";
import { elegirSeccionConsulta, opcionChocaConEditor } from "@/lib/cliente/acciones";
import { $v, colorDe, E, type OpcionJson } from "@/lib/cliente/estado";
import { nombreBonito } from "@/lib/cliente/util";

/** Sección principal (la Clase, o el primer componente) para el título. */
function seccionPrincipal(op: OpcionJson) {
  const clase = op.componentes.find((c) => c.categoria === "Clase") ?? op.componentes[0];
  return clase?.seccion ?? "—";
}

/** ¿La opción coincide con lo buscado? Prioriza la LETRA de sección (lo que la
 * gente escribe: «a», «b»…), y además deja filtrar por catedrático o día. */
function opcionCoincide(op: OpcionJson, q: string) {
  if (!q) return true;
  return op.componentes.some((c) =>
    c.seccion.toLowerCase().startsWith(q) ||
    nombreBonito(c.catedratico).toLowerCase().includes(q) ||
    c.dias.some((d) => d.toLowerCase().startsWith(q)));
}

function LineasOpcion({ op }: { op: OpcionJson }) {
  return (
    <>
      {op.componentes.map((c, i) => (
        <div key={i} className="cs-opcion-linea">
          <span className="cs-opcion-cat">{c.categoria} {c.seccion}</span>
          {c.dias.join(" ")} · {c.inicio}–{c.fin}
          {c.catedratico ? ` · ${nombreBonito(c.catedratico)}` : ""}
        </div>
      ))}
    </>
  );
}

function CursoCard({ codigo, filtro }: { codigo: string; filtro: string }) {
  const [abierto, setAbierto] = useState(false);
  const res = E.resultado!;
  const opciones = res.opciones[codigo] ?? [];
  const actualId = E.editor!.ids.get(codigo) ?? 0;
  const actual = opciones[actualId];
  const nombre = E.porCodigo.get(codigo)?.nombre ?? codigo;
  const [, borde] = colorDe(codigo);

  const q = filtro.trim().toLowerCase();
  const cursoCoincide = !q || codigo.toLowerCase().includes(q) || nombreBonito(nombre).toLowerCase().includes(q);
  const porSeccion = q ? opciones.map((op, id) => ({ op, id })).filter(({ op }) => opcionCoincide(op, q)) : [];

  // Si el texto pega con una sección/catedrático/día, mostramos SOLO esas
  // (ej. «a» → sección A). Si pega con el nombre del curso, mostramos todas.
  const visibles = !q
    ? opciones.map((op, id) => ({ op, id }))
    : porSeccion.length ? porSeccion
      : cursoCoincide ? opciones.map((op, id) => ({ op, id }))
        : [];

  // Con filtro que deja resultados, abrimos la lista sola para que se vean.
  if (q && visibles.length === 0) return null;
  const mostrarLista = abierto || (q.length > 0 && visibles.length > 0);

  return (
    <div className="cs-curso" style={{ "--color": borde } as React.CSSProperties}>
      <button className="cs-curso-head" onClick={() => setAbierto((v) => !v)}>
        <div className="cs-curso-id">
          <span className="cs-codigo">{codigo}</span>
          <span className="cs-nombre">{nombreBonito(nombre)}</span>
        </div>
        <div className="cs-curso-actual">
          {actual ? <>Sección <strong>{seccionPrincipal(actual)}</strong></> : "sin elegir"}
          <span className="cs-chevron">{mostrarLista ? "▲" : "▼"}</span>
        </div>
      </button>

      {mostrarLista && (
        <div className="cs-opciones">
          {opciones.length > 1 ? visibles.map(({ op, id }) => {
            const activa = id === actualId;
            const choca = !activa && opcionChocaConEditor(codigo, id);
            return (
              <button key={id}
                className={"cs-opcion" + (activa ? " activa" : "") + (choca ? " choca" : "")}
                onClick={() => elegirSeccionConsulta(codigo, id)}>
                <div className="cs-opcion-top">
                  <span className="cs-opcion-sec">Sección {seccionPrincipal(op)}</span>
                  {activa && <span className="cs-tag ok">elegida</span>}
                  {choca && <span className="cs-tag warn" title="Se traslapa con otra de tus secciones">choca</span>}
                </div>
                <LineasOpcion op={op} />
              </button>
            );
          }) : (
            <p className="hint sin-margen">Este curso tiene una sola opción de horario.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConstructorSecciones() {
  useStore($v);
  const [q, setQ] = useState("");
  if (!E.editor || !E.resultado) return null;

  const codigos = [...E.editor.ids.keys()]
    .sort((a, b) => E.seleccion.indexOf(a) - E.seleccion.indexOf(b));

  return (
    <div className="constructor no-print">
      <div className="cs-buscador">
        <input type="search" placeholder="Buscá tu sección… ej. «A», un catedrático o un día"
          autoComplete="off" value={q}
          onChange={(ev) => setQ(ev.target.value)} />
      </div>

      {codigos.length ? (
        <div className="cs-lista">
          {codigos.map((codigo) => <CursoCard key={codigo} codigo={codigo} filtro={q} />)}
        </div>
      ) : (
        <p className="hint">
          Agregá los cursos que vas a llevar en el panel de la izquierda y elegí acá
          la sección de cada uno.
        </p>
      )}
    </div>
  );
}
