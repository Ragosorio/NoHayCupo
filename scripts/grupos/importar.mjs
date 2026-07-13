/**
 * Importa grupos de WhatsApp/Telegram desde un Excel al JSON de la app.
 *
 *   node scripts/grupos/importar.mjs "GRUPOS ....xlsx"
 *   node scripts/grupos/importar.mjs archivo.xlsx --periodo 2
 *   node scripts/grupos/importar.mjs archivo.xlsx --catalogo catalogo.json  (offline)
 *
 * Qué hace: lee el Excel, baja el catálogo OFICIAL, y valida cada fila con
 * link contra él (código, nombre, sección, horario, días, catedrático). Si
 * TODO calza y el link es un grupo de WhatsApp/Telegram, lo agrega. Si algo
 * no cuadra, imprime el error y NO escribe nada. Cero dependencias.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { leerXlsx } from "./lib-xlsx.mjs";
import { validarArchivo } from "./validar.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const API = "https://nohaycupo.vercel.app/api/catalogo";

function args() {
  const a = process.argv.slice(2);
  const o = { periodo: "2", catalogo: null, out: null, xlsx: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--periodo") o.periodo = a[++i];
    else if (a[i] === "--catalogo") o.catalogo = a[++i];
    else if (a[i] === "--out") o.out = a[++i];
    else if (!o.xlsx) o.xlsx = a[i];
  }
  return o;
}

async function cargarCatalogo(o) {
  if (o.catalogo) return JSON.parse(readFileSync(o.catalogo, "utf8"));
  const url = `${API}/${encodeURIComponent(o.periodo)}`;
  process.stdout.write(`Bajando catálogo oficial (${url})…\n`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`no se pudo bajar el catálogo (HTTP ${r.status})`);
  const data = await r.json();
  if (!data.cursos?.length) throw new Error("el catálogo vino vacío");
  return data;
}

async function main() {
  const o = args();
  if (!o.xlsx) {
    console.error("Uso: node scripts/grupos/importar.mjs <archivo.xlsx> [--periodo 2]");
    process.exit(2);
  }
  const salida = o.out ? resolve(o.out) : resolve(RAIZ, "web/src/data/grupos.json");

  process.stdout.write(`Leyendo ${o.xlsx}…\n`);
  const { filas } = leerXlsx(o.xlsx);
  const catalogo = await cargarCatalogo(o);

  const { grupos, aceptadas, errores } = validarArchivo(filas, catalogo);

  if (errores.length) {
    console.error(`\n✗ ${errores.length} problema(s) — no se escribió nada:\n`);
    for (const e of errores) console.error("  • " + e);
    console.error("\nCorregí el Excel (o el link) y volvé a correr. Nada entra si no calza con el catálogo real.");
    process.exit(1);
  }

  const total = Object.values(grupos).reduce((n, secs) => n + Object.keys(secs).length, 0);
  const json = {
    periodo: String(o.periodo),
    actualizado: new Date().toISOString().slice(0, 10),
    _nota: "Generado por scripts/grupos/importar.mjs. NO editar a mano: corré el script con tu Excel. Cada valor es un código de curso, una sección o un link de grupo de WhatsApp/Telegram validado contra el catálogo real.",
    grupos,
  };
  writeFileSync(salida, JSON.stringify(json, null, 2) + "\n");
  process.stdout.write(`\n✓ ${aceptadas} sección(es) con grupo, ${total} en total.\n`);
  process.stdout.write(`  Escrito: ${salida}\n`);
  process.stdout.write("  Revisá el diff y abrí tu Pull Request. ¡Gracias por aportar!\n");
}

main().catch((e) => { console.error("✗ " + e.message); process.exit(1); });
