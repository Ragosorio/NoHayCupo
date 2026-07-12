/** Zona de resultados: estrategias, opciones, métricas, calendario, editor y plan B. */
import { useStore } from "@nanostores/react";
import {
  comboMostrado, deshacerSwap, elegirEstrategia, elegirOpcion, entrarEditor,
  estrategiaActiva, ghostsPara, metricasMostradas, planBDelMostrado,
  quitarYRegenerar, salirEditor, setModal, toast, verMasOpciones, aplicarSwap,
} from "@/lib/cliente/acciones";
import { coincidenciasConAmigo } from "@/lib/cliente/compartir";
import { $v, colorDe, E, type ComboJson, type OpcionJson } from "@/lib/cliente/estado";
import { exportarExcel, exportarIcs, exportarPng, exportarPrompt } from "@/lib/cliente/exportar";
import { DIAS_NOMBRE, nombreBonito } from "@/lib/cliente/util";
import Calendario from "./Calendario";
import {
  IconoAlerta, IconoCalendario, IconoChispa, IconoCompartir, IconoImagen,
  IconoImpresora, IconoLapiz, IconoTabla,
} from "./Iconos";

const etiquetaOpcion = (op: { componentes: OpcionJson["componentes"] }) =>
  op.componentes
    .map((c) => `${c.categoria} ${c.seccion} (${c.dias.join(" ")} ${c.inicio}–${c.fin})`)
    .join(" + ");

function Metricas({ m }: { m: NonNullable<ReturnType<typeof metricasMostradas>> }) {
  const libres = m.dias_libres.length
    ? m.dias_libres.map((d) => DIAS_NOMBRE[d]).join(", ") : "ninguno";
  const chips: Array<{ clase?: string; valor: string; texto: string }> = [];
  if (m.minutos_evitar_totales > 0) {
    const totalH = (m.minutos_evitar_totales / 60).toFixed(1).replace(".0", "");
    chips.push({
      clase: m.minutos_en_evitar ? "metrica-alerta" : "metrica-ok",
      valor: `${m.horas_en_evitar} h`,
      texto: `usadas de tu zona «mejor no» (marcaste ${totalH} h)`,
    });
  }
  chips.push({ valor: libres, texto: "día(s) de semana sin clase" });
  chips.push({ valor: String(m.num_dias_con_clase), texto: "días de semana con clase" });
  chips.push({ valor: m.usa_sabado ? "Sí" : "No", texto: "usa sábado" });
  chips.push({ valor: `${m.min_bloque_libre_h} h`, texto: "bloque libre mínimo por día" });
  const coin = coincidenciasConAmigo();
  if (coin && coin.comunes > 0) {
    chips.push({
      clase: coin.iguales > 0 ? "metrica-ok" : "",
      valor: `${coin.iguales}/${coin.comunes}`,
      texto: `cursos en la misma sección que ${coin.de}`,
    });
  }
  return (
    <div className="metricas">
      {chips.map((c, i) => (
        <div key={i} className={`metrica ${c.clase ?? ""}`} style={{ "--i": i } as React.CSSProperties}>
          <strong>{c.valor}</strong>{c.texto}
        </div>
      ))}
    </div>
  );
}

function Alternativas() {
  const sel = E.editor?.seleccionado;
  if (!sel) return null;
  const res = E.resultado!;
  const nombre = E.porCodigo.get(sel)?.nombre ?? sel;
  const actual = res.opciones[sel][E.editor!.ids.get(sel)!];
  const alts = ghostsPara(sel);
  const [, borde] = colorDe(sel);
  return (
    <div className="alternativas no-print">
      <h3>{sel} · {nombreBonito(nombre)}</h3>
      <p className="alt-sub">
        Elegí a dónde moverlo — solo se muestran horarios que no chocan con tus otros
        cursos ni con tus bloqueos. Los punteados en el calendario son lo mismo.
      </p>
      <div className="alt-lista">
        <button className="alt-item actual" style={{ "--color": borde } as React.CSSProperties} disabled>
          <span className="alt-et">{actual.etiqueta}</span>
          <span className="alt-nota">actual</span>
        </button>
        {alts.map((g) => (
          <button key={g.id} className="alt-item" style={{ "--color": borde } as React.CSSProperties}
            onClick={() => aplicarSwap(sel, g.id)}>
            <span className="alt-et">{g.etiqueta}</span>
            {g.componentes[0]?.catedratico && (
              <span className="alt-nota">{nombreBonito(g.componentes[0].catedratico)}</span>
            )}
          </button>
        ))}
        {!alts.length && (
          <div className="alt-item actual">
            No hay otro horario de este curso que quepa sin mover los demás.
          </div>
        )}
      </div>
    </div>
  );
}

function PlanB({ combo }: { combo: Pick<ComboJson, "cursos" | "emergencia"> }) {
  return (
    <section className="planb">
      <h2>Si una sección se llena <span className="planb-sub">alternativas que no rompen el resto</span></h2>
      <div className="planb-cards">
        {combo.cursos.map((curso, i) => {
          const [, borde] = colorDe(curso.codigo);
          const equivalentes = curso.componentes.flatMap((c) =>
            c.equivalentes.map((eq) => ({ ...eq, categoria: c.categoria })));
          const alts = combo.emergencia[curso.codigo] ?? [];
          const respaldos = equivalentes.length + alts.length;
          return (
            <div key={curso.codigo} className="planb-card"
              style={{ "--color": borde, "--i": i } as React.CSSProperties}>
              <div className="planb-head">
                <h3>{curso.codigo} · {nombreBonito(curso.nombre)}</h3>
                {respaldos === 0 ? (
                  <span className="planb-badge critico"
                    title="No hay otra sección ni otro horario que quepa: si esta sección se llena, hay que rearmar el horario completo.">
                    Crítico
                  </span>
                ) : (
                  <span className="planb-badge respaldo"
                    title={`Hay ${respaldos} respaldo(s): otra sección con el mismo horario u otro horario que también cabe sin mover el resto.`}>
                    {respaldos} respaldo{respaldos === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="sub">Elegida: {etiquetaOpcion(curso)}</div>
              <div className="grupo">Mismo horario, otro catedrático</div>
              {equivalentes.length ? (
                <ul>{equivalentes.map((eq, j) => (
                  <li key={j}>{eq.categoria} <strong>{eq.seccion}</strong> — {nombreBonito(eq.catedratico)}</li>
                ))}</ul>
              ) : <div className="nada">No hay — esta es la única sección con este horario.</div>}
              <div className="grupo">Otro horario que también cabe</div>
              {alts.length ? (
                <ul>{alts.map((a, j) => (
                  <li key={j} className="etiqueta-alt">{etiquetaOpcion(a)}</li>
                ))}</ul>
              ) : <div className="nada">Ninguno: si se llena, hay que rearmar el horario.</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Resultados() {
  useStore($v);
  const res = E.resultado;
  if (!res) return null;

  const est = estrategiaActiva();
  const combos = est?.combos ?? [];
  const mostrado = comboMostrado();
  const comboActivo = !E.editor && E.opcion !== "mia" ? combos[E.opcion as number] : undefined;
  const metricas = mostrado ? metricasMostradas(comboActivo) : null;
  const sel = E.editor?.seleccionado;
  const msgEditor = E.editor
    ? sel
      ? `${sel} · ${nombreBonito(E.porCodigo.get(sel)?.nombre ?? sel)} — ${ghostsPara(sel).length} horario(s) alternativo(s) caben sin mover el resto.`
      : "Modo edición — clic en un curso del calendario para ver a dónde se puede mover sin romper el resto."
    : "";

  return (
    <div>
      {res.advertencias.length > 0 && (
        <div className="advertencias no-print">
          <div className="titulo"><IconoAlerta /> Cosas que debés saber</div>
          <ul>{res.advertencias.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      {res.sacrificios.length > 0 && (
        <div className="sacrificios no-print">
          <div className="titulo">Si sacrificás un curso, esto se destraba:</div>
          <div className="sacrificios-lista">
            {res.sacrificios.map((s) => (
              <div key={s.codigo} className="sacrificio">
                <span className="s-info">
                  <strong>{s.codigo}</strong> {nombreBonito(s.nombre)}
                  <span className="s-n">
                    → {s.combinaciones.toLocaleString("es")}{s.combinaciones >= 5000 ? "+" : ""} combinaciones sin él
                  </span>
                </span>
                <button className="btn btn-mini" onClick={() => quitarYRegenerar(s.codigo)}>
                  Quitarlo y regenerar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="tabs no-print" id="tabsEstrategias">
        {res.estrategias.map((e) => (
          <button key={e.id}
            className={"tab" + (e.id === E.estrategia && E.opcion !== "mia" ? " activa" : "")}
            onClick={() => elegirEstrategia(e.id)}>
            <span className="t-nombre">{e.nombre}</span>
            <span className="t-desc">{e.descripcion}</span>
          </button>
        ))}
      </nav>

      <div className="resultado-header no-print">
        <div className="resultado-izq">
          <div className="pager">
            {combos.map((_, i) => (
              <button key={i} className={i === E.opcion ? "activa" : ""}
                onClick={() => elegirOpcion(i)}>
                Opción {i + 1}
              </button>
            ))}
            {E.miHorario && (
              <button className={"mia" + (E.opcion === "mia" ? " activa" : "")}
                title="El horario que ajustaste a mano"
                onClick={() => elegirOpcion("mia")}>
                <IconoLapiz size={11} /> Mi horario
              </button>
            )}
          </div>
          {combos.length > 0 && res.total_validas > combos.length && E.topN < 25 && (
            <button className="btn-enlace" onClick={verMasOpciones}>ver más opciones</button>
          )}
        </div>
        <div className="acciones">
          <span className="resumen-total">
            {res.total_validas > 0
              ? `${res.total_validas.toLocaleString("es")} combinaciones válidas`
              : "Sin combinaciones válidas"}
          </span>
          {!E.editor && mostrado && (
            <button id="btnEditar" className="btn" onClick={entrarEditor}>
              <IconoLapiz /> Ajustar
            </button>
          )}
          <div className="menu-export">
            <button id="btnExportar" className="btn"
              onClick={(ev) => { ev.stopPropagation(); setModal("export", !E.menuExportar); }}>
              Exportar ▾
            </button>
            <div className="menu-export-lista" hidden={!E.menuExportar}>
              <button onClick={() => { setModal("export", false); setModal("compartir", true); }}>
                <IconoCompartir /> Compartir con un amigo
              </button>
              <button onClick={() => { setModal("export", false); exportarPng(); toast("Imagen PNG descargada"); }}>
                <IconoImagen /> Imagen PNG
              </button>
              <button onClick={() => { setModal("export", false); exportarIcs(); toast("Archivo .ics descargado — importalo en Google Calendar"); }}>
                <IconoCalendario /> Google Calendar (.ics)
              </button>
              <button onClick={() => { setModal("export", false); exportarExcel(); toast("Archivo .xlsx descargado — abrilo con Excel"); }}>
                <IconoTabla /> Excel (.xlsx)
              </button>
              <button title="Copia un prompt con tus cursos, secciones y bloqueos para pedirle a una IA que analice tu horario"
                onClick={() => { setModal("export", false); exportarPrompt(); }}>
                <IconoChispa /> Prompt para IA
              </button>
              <button onClick={() => { setModal("export", false); window.print(); }}>
                <IconoImpresora /> Imprimir / PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {E.editor && (
        <div className="barra-editor no-print">
          <span>{msgEditor}</span>
          <span className="barra-editor-btns">
            <button className="btn btn-mini" disabled={!E.editor.undo.length} onClick={deshacerSwap}>
              ↩ Deshacer
            </button>
            <button className="btn btn-mini" onClick={() => salirEditor(true)}>✓ Listo</button>
          </span>
        </div>
      )}

      {mostrado ? (
        <>
          {metricas && <Metricas m={metricas} />}
          <Calendario mostrado={mostrado} />
          {E.editor && <Alternativas />}
          {!E.editor && (E.opcion === "mia"
            ? (() => { const pb = planBDelMostrado(); return pb && <PlanB combo={pb} />; })()
            : comboActivo && <PlanB combo={comboActivo} />)}
        </>
      ) : (
        <div className="calendario">
          <p className="hint" style={{ margin: 8 }}>
            No hay ninguna combinación posible con esos cursos y bloqueos.
            Revisá las advertencias y sugerencias de arriba.
          </p>
        </div>
      )}
    </div>
  );
}
