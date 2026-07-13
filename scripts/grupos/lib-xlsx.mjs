/**
 * Mini-lector de .xlsx SIN dependencias (un .xlsx es un ZIP de XML).
 *
 * El proyecto NO usa librerías para Excel a propósito: el export .xlsx del
 * navegador ya arma el ZIP a mano, y acá hacemos lo simétrico al leerlo.
 * Solo lo que necesitamos: hoja 1, valores de celda (shared/inline strings y
 * números) e hipervínculos por celda. Nada de fórmulas, estilos ni macros.
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/* ---------- lector de ZIP (central directory) ---------- */

function leerZip(buf) {
  // End Of Central Directory: firma 0x06054b50, buscándola desde el final.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("No parece un .xlsx válido (falta el índice ZIP)");
  let ptr = buf.readUInt32LE(eocd + 16);      // offset del central directory
  const total = buf.readUInt16LE(eocd + 10);  // cantidad de entradas
  const entradas = new Map();
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const nombre = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    entradas.set(nombre, { metodo, compSize, localOff });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entradas;
}

function extraer(buf, entrada) {
  // El local header repite nombre/extra con longitudes propias.
  const o = entrada.localOff;
  if (buf.readUInt32LE(o) !== 0x04034b50) throw new Error("Entrada ZIP corrupta");
  const nameLen = buf.readUInt16LE(o + 26);
  const extraLen = buf.readUInt16LE(o + 28);
  const inicio = o + 30 + nameLen + extraLen;
  const datos = buf.subarray(inicio, inicio + entrada.compSize);
  if (entrada.metodo === 0) return datos;              // guardado sin comprimir
  if (entrada.metodo === 8) return inflateRawSync(datos); // deflate
  throw new Error(`Compresión ZIP no soportada: ${entrada.metodo}`);
}

/* ---------- utilidades XML mínimas ---------- */

const desescapar = (s) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#10;/g, "\n").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g, "&");

const colDe = (ref) => ref.replace(/[0-9]+/g, "");

/* ---------- lectura de la hoja ---------- */

/**
 * Lee la primera hoja de un .xlsx.
 * @returns {{ filas: Array<{ n: number, celdas: Record<string,string>, links: Record<string,string> }> }}
 *   `celdas`: columna (A,B,…) → texto. `links`: columna → URL del hipervínculo.
 */
export function leerXlsx(ruta) {
  const buf = readFileSync(ruta);
  const zip = leerZip(buf);
  const texto = (nombre) => {
    const e = zip.get(nombre);
    return e ? extraer(buf, e).toString("utf8") : null;
  };

  // shared strings (índice → texto)
  const ssXml = texto("xl/sharedStrings.xml") || "";
  const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    desescapar([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("")));

  // ¿cuál es la primera hoja? El workbook + rels lo dicen; en la práctica
  // siempre es sheet1.xml, pero resolvámoslo bien por si acaso.
  let hoja = "xl/worksheets/sheet1.xml";
  let hojaRels = "xl/worksheets/_rels/sheet1.xml.rels";
  const wbRels = texto("xl/_rels/workbook.xml.rels") || "";
  const wb = texto("xl/workbook.xml") || "";
  const rid = /<sheet[^>]*r:id="([^"]+)"/.exec(wb)?.[1];
  if (rid) {
    const tgt = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(wbRels)?.[1];
    if (tgt) {
      hoja = "xl/" + tgt.replace(/^\/?xl\//, "");
      hojaRels = hoja.replace(/([^/]+)$/, "_rels/$1.rels");
    }
  }
  const sheetXml = texto(hoja) || "";

  // hipervínculos de la hoja: ref de celda → URL destino
  const relsXml = texto(hojaRels) || "";
  const relTarget = {};
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relTarget[m[1]] = desescapar(m[2]);
  }
  const linkPorCelda = {};
  for (const m of sheetXml.matchAll(/<hyperlink\b([^>]*)\/>/g)) {
    const attrs = m[1];
    const ref = /ref="([^"]+)"/.exec(attrs)?.[1];
    const rId = /r:id="([^"]+)"/.exec(attrs)?.[1];
    if (ref && rId && relTarget[rId]) linkPorCelda[ref] = relTarget[rId];
  }

  // filas y celdas
  const filas = [];
  for (const r of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const n = +r[1];
    const celdas = {};
    const links = {};
    for (const c of r[2].matchAll(/<c r="([A-Z]+\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1], attrs = c[2], cuerpo = c[3] || "";
      const col = colDe(ref);
      const tipo = /t="([^"]+)"/.exec(attrs)?.[1];
      let val = "";
      if (tipo === "inlineStr") {
        val = desescapar([...cuerpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
        if (v != null) val = tipo === "s" ? (shared[+v] ?? "") : desescapar(v);
      }
      if (val !== "") celdas[col] = val;
      if (linkPorCelda[ref]) links[col] = linkPorCelda[ref];
    }
    filas.push({ n, celdas, links });
  }
  return { filas };
}
