/** Pintor de bloqueos de tiempo: arrastrá para marcar «Imposible» / «Mejor no». */
import { useStore } from "@nanostores/react";
import { useEffect, useRef } from "react";
import { claveSlot, limpiarBloqueos, pintarCelda } from "@/lib/cliente/acciones";
import { $v, E, guardarLocal, touch } from "@/lib/cliente/estado";
import { aHHMM, DIAS_CORTO, DIAS_NOMBRE, DIAS_ORDEN, GRID_FIN, GRID_INI, SLOT_MIN } from "@/lib/cliente/util";

const PINCELES = [
  { nivel: "imposible", nombre: "Imposible", title: "Tiempo intocable (trabajo, etc.): ninguna propuesta lo usará jamás." },
  { nivel: "evitar", nombre: "Mejor no", title: "Preferís no usarlo, pero si es necesario se puede. Se minimiza al rankear." },
  { nivel: "borrar", nombre: "Borrar", title: "Borrar lo pintado" },
] as const;

export default function PanelTiempo() {
  useStore($v);
  const pintando = useRef<string | null>(null);
  const ultima = useRef<{ dia: string; min: number } | null>(null);

  useEffect(() => {
    const alSoltar = () => {
      if (!pintando.current) return;
      pintando.current = null;
      ultima.current = null;
      guardarLocal();
      touch();
    };
    document.addEventListener("pointerup", alSoltar);
    return () => document.removeEventListener("pointerup", alSoltar);
  }, []);

  /* Pinta el rectángulo entre la última celda y la actual — un arrastre rápido
     se saltea celdas y dejaría huecos. */
  const pintarHasta = (dia: string, min: number) => {
    const pincel = pintando.current!;
    if (ultima.current) {
      const [d0, d1] = [DIAS_ORDEN.indexOf(ultima.current.dia as never), DIAS_ORDEN.indexOf(dia as never)]
        .sort((a, b) => a - b);
      const [m0, m1] = [ultima.current.min, min].sort((a, b) => a - b);
      for (let di = d0; di <= d1; di++) {
        for (let m = m0; m <= m1; m += SLOT_MIN) pintarCelda(DIAS_ORDEN[di], m, pincel);
      }
    } else {
      pintarCelda(dia, min, pincel);
    }
    ultima.current = { dia, min };
    touch();
  };

  const alBajar = (dia: string, min: number) => {
    const pincel = E.pincel;
    pintando.current =
      pincel !== "borrar" && E.bloqueos.get(claveSlot(dia, min)) === pincel ? "borrar" : pincel;
    ultima.current = null;
    pintarHasta(dia, min);
  };

  let imp = 0, evi = 0;
  for (const nivel of E.bloqueos.values()) nivel === "imposible" ? imp++ : evi++;
  const h = (n: number) => (n * SLOT_MIN / 60).toFixed(1).replace(".0", "");
  const resumen = [imp && `${h(imp)} h imposibles`, evi && `${h(evi)} h «mejor no»`]
    .filter(Boolean).join(" · ");

  const filas: number[] = [];
  for (let m = GRID_INI; m < GRID_FIN; m += SLOT_MIN) filas.push(m);

  return (
    <section className="panel" id="panelTiempo">
      <h2>Tu tiempo <span className="h2-sub">opcional</span></h2>
      <div className="pinceles">
        {PINCELES.map((p) => (
          <button key={p.nivel} title={p.title}
            className={`pincel ${p.nivel}${E.pincel === p.nivel ? " activa" : ""}`}
            onClick={() => { E.pincel = p.nivel; touch(); }}>
            {p.nombre}
          </button>
        ))}
      </div>
      <div className="grid-bloqueos"
        style={{ gridTemplateColumns: `34px repeat(${DIAS_ORDEN.length}, 1fr)` }}
        onPointerDown={(ev) => {
          const celda = (ev.target as HTMLElement).closest<HTMLElement>(".gb-celda");
          if (!celda) return;
          ev.preventDefault();
          alBajar(celda.dataset.dia!, Number(celda.dataset.min));
        }}
        onPointerOver={(ev) => {
          if (!pintando.current || ev.pointerType !== "mouse") return;
          const celda = (ev.target as HTMLElement).closest<HTMLElement>(".gb-celda");
          if (celda) pintarHasta(celda.dataset.dia!, Number(celda.dataset.min));
        }}
        onPointerMove={(ev) => {
          /* Con dedo/lápiz el navegador captura el pointer en la celda inicial
             y pointerover no dispara: buscamos la celda bajo el dedo a mano. */
          if (!pintando.current || ev.pointerType === "mouse") return;
          const celda = document.elementFromPoint(ev.clientX, ev.clientY)
            ?.closest<HTMLElement>(".gb-celda");
          if (celda) pintarHasta(celda.dataset.dia!, Number(celda.dataset.min));
        }}>
        <div />
        {DIAS_ORDEN.map((d) => (
          <div key={d} className="gb-head" title={DIAS_NOMBRE[d]}>{DIAS_CORTO[d]}</div>
        ))}
        {filas.map((min) => (
          <FilaGrid key={min} min={min} />
        ))}
      </div>
      <div className="bloqueos-pie">
        <span className="hint sin-margen">
          {resumen ? `${resumen} /semana` : "Pintá arrastrando. Sin bloqueos, se usa cualquier hora."}
        </span>
        {E.bloqueos.size > 0 && (
          <button className="btn-enlace" onClick={limpiarBloqueos}>limpiar</button>
        )}
      </div>
    </section>
  );
}

function FilaGrid({ min }: { min: number }) {
  return (
    <>
      <div className="gb-hora">{min % 60 === 0 ? aHHMM(min) : ""}</div>
      {DIAS_ORDEN.map((d) => {
        const nivel = E.bloqueos.get(claveSlot(d, min));
        return (
          <div key={d} className={"gb-celda" + (nivel ? ` ${nivel}` : "")}
            data-dia={d} data-min={min} />
        );
      })}
    </>
  );
}
