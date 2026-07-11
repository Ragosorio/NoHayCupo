/** Exportar el horario: PNG (canvas), .ics y prompt para IA — puerto de app.js. */
import { bloqueosComoRangos, comboMostrado, etiquetaComponentes, toast } from "./acciones";
import { colorDe, E } from "./estado";
import { aMin, DIAS_NOMBRE, DIAS_ORDEN, nombreBonito, nombrePeriodo } from "./util";

function eventosDe(mostrado: NonNullable<ReturnType<typeof comboMostrado>>) {
  const eventos = [];
  for (const curso of mostrado) {
    const [fondo, borde, tinta] = colorDe(curso.codigo);
    for (const comp of curso.opcion.componentes) {
      for (const dia of comp.dias) {
        eventos.push({
          dia, inicio: aMin(comp.inicio), fin: aMin(comp.fin),
          codigo: curso.codigo, nombre: curso.nombre,
          seccion: comp.seccion, categoria: comp.categoria,
          horas: `${comp.inicio}–${comp.fin}`,
          fondo, borde, tinta,
        });
      }
    }
  }
  return eventos;
}

export function exportarPng() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  const eventos = eventosDe(mostrado);
  const bloqueos = bloqueosComoRangos();
  const usados = new Set(eventos.map((e) => e.dia));
  const dias = DIAS_ORDEN.filter((d, i) => i < 5 || usados.has(d));

  const oscuro = E.tema === "dark";
  const C = oscuro
    ? { fondo: "#0e1220", linea: "#242c40", tinta: "#e8ebf4", suave: "#a2abbe" }
    : { fondo: "#ffffff", linea: "#eceef2", tinta: "#191d2b", suave: "#616a7b" };

  const horaIni = Math.floor(Math.min(...eventos.map((e) => e.inicio), 7 * 60) / 60);
  const horaFin = Math.ceil(Math.max(...eventos.map((e) => e.fin), 14 * 60) / 60);
  const pxMin = 1.3, margenIzq = 64, margenTop = 76, anchoDia = 168, pad = 24;
  const W = margenIzq + dias.length * anchoDia + pad;
  const H = margenTop + (horaFin - horaIni) * 60 * pxMin + pad;
  const y = (min: number) => margenTop + (min - horaIni * 60) * pxMin;

  const canvas = document.createElement("canvas");
  const escala = 2;
  canvas.width = W * escala; canvas.height = H * escala;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(escala, escala);
  const F = "-apple-system, 'Segoe UI', Roboto, sans-serif";

  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.tinta;
  ctx.font = `800 17px ${F}`;
  ctx.fillText("Mi horario · NoHayCupo", pad, 34);
  ctx.fillStyle = C.suave;
  ctx.font = `12px ${F}`;
  ctx.fillText(`FIUSAC · ${nombrePeriodo(E.semestre)} · ${mostrado.length} cursos`, pad, 52);

  dias.forEach((d, i) => {
    ctx.fillStyle = C.suave;
    ctx.font = `700 12px ${F}`;
    ctx.textAlign = "center";
    ctx.fillText(DIAS_NOMBRE[d], margenIzq + i * anchoDia + anchoDia / 2, margenTop - 10);
  });
  ctx.textAlign = "left";

  for (let h = horaIni; h <= horaFin; h++) {
    ctx.strokeStyle = C.linea;
    ctx.beginPath();
    ctx.moveTo(margenIzq, y(h * 60));
    ctx.lineTo(W - pad, y(h * 60));
    ctx.stroke();
    ctx.fillStyle = C.suave;
    ctx.font = `10px ${F}`;
    ctx.textAlign = "right";
    ctx.fillText(`${String(h).padStart(2, "0")}:00`, margenIzq - 8, y(h * 60) + 3);
    ctx.textAlign = "left";
  }

  for (const b of bloqueos) {
    const i = dias.indexOf(b.dia as (typeof dias)[number]);
    if (i < 0) continue;
    const x = margenIzq + i * anchoDia;
    const yi = y(Math.max(aMin(b.inicio), horaIni * 60));
    const yf = y(Math.min(aMin(b.fin), horaFin * 60));
    if (yf <= yi) continue;
    ctx.fillStyle = b.nivel === "imposible" ? "rgba(229,72,77,.12)" : "rgba(226,183,92,.14)";
    ctx.fillRect(x + 1, yi, anchoDia - 2, yf - yi);
  }

  for (const e of eventos) {
    const i = dias.indexOf(e.dia as (typeof dias)[number]);
    if (i < 0) continue;
    const x = margenIzq + i * anchoDia + 4;
    const w = anchoDia - 8;
    const yi = y(e.inicio), hf = Math.max(24, (e.fin - e.inicio) * pxMin - 3);
    ctx.fillStyle = e.fondo;
    ctx.beginPath(); ctx.roundRect(x, yi, w, hf, 7); ctx.fill();
    ctx.strokeStyle = e.borde; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, yi, w, hf, 7); ctx.stroke();
    ctx.fillStyle = e.borde;
    ctx.fillRect(x, yi + 1, 3.5, hf - 2);
    ctx.fillStyle = e.tinta;
    ctx.font = `800 11px ${F}`;
    ctx.fillText(`${e.codigo} · ${e.seccion}${e.categoria !== "Clase" ? " · " + e.categoria.toUpperCase() : ""}`, x + 9, yi + 14);
    ctx.font = `10px ${F}`;
    const nombre = nombreBonito(e.nombre);
    ctx.fillText(nombre.length > 26 ? nombre.slice(0, 25) + "…" : nombre, x + 9, yi + 27);
    if (hf > 38) ctx.fillText(e.horas, x + 9, yi + 40);
  }

  const a = document.createElement("a");
  a.download = "horario-nohaycupo.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

const ICS_DIA: Record<string, string> = { LU: "MO", MA: "TU", MI: "WE", JU: "TH", VI: "FR", SA: "SA", DO: "SU" };
const JS_DIA: Record<string, number> = { LU: 1, MA: 2, MI: 3, JU: 4, VI: 5, SA: 6, DO: 0 };

export function exportarIcs() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  const lineas = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//NoHayCupo//Horarios FIUSAC//ES", "CALSCALE:GREGORIAN",
  ];
  const hoy = new Date();
  const fmt = (d: Date, hhmm: string) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${hhmm.replace(":", "")}00`;
  let uid = 0;
  for (const curso of mostrado) {
    for (const comp of curso.opcion.componentes) {
      for (const dia of comp.dias) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + ((JS_DIA[dia] - hoy.getDay() + 7) % 7));
        const nombre = `${curso.codigo} ${nombreBonito(curso.nombre)}`
          + (comp.categoria !== "Clase" ? ` (${comp.categoria})` : "");
        lineas.push(
          "BEGIN:VEVENT",
          `UID:nhc-${Date.now()}-${uid++}@nohaycupo.local`,
          `DTSTART:${fmt(fecha, comp.inicio)}`,
          `DTEND:${fmt(fecha, comp.fin)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DIA[dia]};COUNT=18`,
          `SUMMARY:${nombre} · sec ${comp.seccion}`,
          `DESCRIPTION:${nombreBonito(comp.catedratico || "")}`,
          "END:VEVENT",
        );
      }
    }
  }
  lineas.push("END:VCALENDAR");
  const blob = new Blob([lineas.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.download = "horario-nohaycupo.ics";
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Excel (.xlsx) ----------
 * Un .xlsx es un zip con XMLs adentro. Acá se arma el zip a mano (método
 * «store», sin compresión) para no cargar ninguna dependencia: para una
 * tabla de un horario el tamaño es irrelevante. */

const XMLH = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const escXml = (s: string) => s
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let crcTabla: Uint32Array | null = null;
function crc32(datos: Uint8Array): number {
  if (!crcTabla) {
    crcTabla = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTabla[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of datos) crc = crcTabla[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(archivos: Array<[nombre: string, contenido: string]>): Blob {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;
  for (const [nombre, contenido] of archivos) {
    const nom = enc.encode(nombre);
    const datos = enc.encode(contenido);
    const crc = crc32(datos);
    const local = new Uint8Array(30 + nom.length + datos.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);       // firma de entrada local
    lv.setUint16(4, 20, true);               // versión mínima
    lv.setUint32(14, crc, true);
    lv.setUint32(18, datos.length, true);    // "comprimido" = original (store)
    lv.setUint32(22, datos.length, true);
    lv.setUint16(26, nom.length, true);
    local.set(nom, 30);
    local.set(datos, 30 + nom.length);
    partes.push(local);
    const cen = new Uint8Array(46 + nom.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);       // firma del directorio central
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, datos.length, true);
    cv.setUint32(24, datos.length, true);
    cv.setUint16(28, nom.length, true);
    cv.setUint32(42, offset, true);
    cen.set(nom, 46);
    centrales.push(cen);
    offset += local.length;
  }
  const tamCentral = centrales.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);         // fin del directorio central
  ev.setUint16(8, archivos.length, true);
  ev.setUint16(10, archivos.length, true);
  ev.setUint32(12, tamCentral, true);
  ev.setUint32(16, offset, true);
  return new Blob([...partes, ...centrales, eocd], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function exportarExcel() {
  const mostrado = comboMostrado();
  if (!mostrado) return;
  const filas: string[][] = [
    ["Código", "Curso", "Componente", "Sección", "Días", "Inicio", "Fin", "Catedrático"],
  ];
  for (const curso of mostrado) {
    for (const comp of curso.opcion.componentes) {
      filas.push([
        curso.codigo, nombreBonito(curso.nombre), comp.categoria, comp.seccion,
        comp.dias.map((d) => DIAS_NOMBRE[d]).join(" y "),
        comp.inicio, comp.fin, nombreBonito(comp.catedratico || ""),
      ]);
    }
  }
  const celda = (v: string) =>
    `<c t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
  const anchos = [10, 36, 13, 10, 30, 8, 8, 32];
  const sheet = `${XMLH}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    + `<sheetData>${filas.map((f) => `<row>${f.map(celda).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const blob = zipStore([
    ["[Content_Types].xml", `${XMLH}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
      + `<Default Extension="xml" ContentType="application/xml"/>`
      + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
      + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
    ["_rels/.rels", `${XMLH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${XMLH}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<sheets><sheet name="Horario" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `${XMLH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);
  const a = document.createElement("a");
  a.download = "horario-nohaycupo.xlsx";
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

function construirPromptIA(): string {
  const mostrado = comboMostrado();
  const L: string[] = [];
  L.push("# Ayudame a optimizar mi horario universitario (FIUSAC, USAC)");
  L.push("");
  L.push("Actuá como experto en armar horarios universitarios sin traslapes. Abajo te doy MIS cursos con TODAS sus secciones reales del catálogo, mis restricciones de tiempo y (si existe) el horario que estoy considerando.");
  L.push("");
  L.push("## Formato de los datos");
  L.push("Cada sección viene como: `SECCIÓN | COMPONENTE | DÍAS | HORARIO | CATEDRÁTICO | NOTA`");
  L.push("- COMPONENTE: si un curso tiene Clase y Laboratorio/Práctica, debo inscribir UNO de cada componente y no pueden traslaparse entre sí ni con otros cursos.");
  L.push("- DÍAS: LU MA MI JU VI SA DO. Dos clases se traslapan solo si comparten día Y sus rangos de hora se cruzan (tocarse en el minuto exacto NO es traslape).");
  L.push("- NOTA `restringida:no-me-aplica`: NO puedo inscribirla, descartala. `restringida:aplica`: sí puedo. `restringida:revisar`: solo si cumplo la condición indicada.");
  L.push("");

  const rangos = bloqueosComoRangos();
  L.push("## Mis restricciones de tiempo");
  if (!rangos.length) {
    L.push("- Ninguna: cualquier hora sirve.");
  } else {
    for (const b of rangos.filter((r) => r.nivel === "imposible")) {
      L.push(`- IMPOSIBLE (jamás usar): ${DIAS_NOMBRE[b.dia]} ${b.inicio}–${b.fin}`);
    }
    for (const b of rangos.filter((r) => r.nivel === "evitar")) {
      L.push(`- MEJOR NO (usar lo mínimo posible): ${DIAS_NOMBRE[b.dia]} ${b.inicio}–${b.fin}`);
    }
  }
  L.push("");

  L.push(`## Mis cursos (${E.seleccion.length}) y todas sus secciones`);
  for (const codigo of E.seleccion) {
    const curso = E.porCodigo.get(codigo);
    if (!curso) continue;
    L.push("");
    L.push(`### ${codigo} · ${nombreBonito(curso.nombre)}`);
    const comps = etiquetaComponentes(curso);
    if (comps) L.push(`(Se inscribe como: ${comps} — un horario por componente)`);
    const marcadas = E.restringidas[codigo] ?? new Set();
    const verdictos = E.restric[codigo] ?? {};
    for (const s of curso.secciones) {
      if (!s.inicio || !s.dias.length) continue;
      let nota = "libre";
      if (s.restringida) {
        const v = verdictos[s.seccion];
        if (v?.veredicto === "no_aplica") nota = "restringida:no-me-aplica";
        else if (v?.veredicto === "aplica" || marcadas.has(s.seccion)) nota = "restringida:aplica";
        else if (v?.veredicto === "revisar") nota = `restringida:revisar (${v.detalle.join("; ")})`;
        else nota = "restringida:revisar";
      }
      L.push(`${s.seccion} | ${s.categoria || "Clase"} | ${s.dias.join(" ")} | ${s.inicio}–${s.fin} | ${nombreBonito(s.catedratico)} | ${nota}`);
    }
  }
  L.push("");

  if (mostrado) {
    L.push("## Horario que estoy considerando ahora");
    for (const c of mostrado) {
      L.push(`- ${c.codigo} ${nombreBonito(c.nombre)}: ${c.opcion.etiqueta}`);
    }
    L.push("");
  }

  L.push("## Qué te pido");
  L.push("1. Verificá que el horario que estoy considerando no tenga traslapes ni use secciones que no me aplican.");
  L.push("2. Proponé hasta 3 alternativas COMPLETAS (todos mis cursos) que: (a) no tengan traslapes, (b) nunca usen horas IMPOSIBLES, (c) minimicen las horas en zonas MEJOR NO, y (d) como desempate, dejen los huecos entre clases más cortos.");
  L.push("3. Presentá cada propuesta como tabla por día (LU–SA) con curso, sección, componente y horario, y explicá en una línea qué mejora respecto a mi horario actual.");
  L.push("4. Si algún curso no cabe de ninguna forma, decime cuál y qué lo bloquea.");
  L.push("");
  L.push("_Datos generados por NoHayCupo (github.com/Ragosorio/NoHayCupo) con el catálogo oficial de FIUSAC._");
  return L.join("\n");
}

export async function exportarPrompt() {
  if (!E.seleccion.length) { toast("Agregá cursos primero"); return; }
  const texto = construirPromptIA();
  try {
    await navigator.clipboard.writeText(texto);
    toast("Prompt copiado — pegalo en tu IA favorita");
  } catch {
    const blob = new Blob([texto], { type: "text/markdown" });
    const a = document.createElement("a");
    a.download = "prompt-horario-nohaycupo.md";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Prompt descargado como .md");
  }
}
