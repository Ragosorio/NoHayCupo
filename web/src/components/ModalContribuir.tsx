/** Modal «cómo subir un grupo»: pasos simples para que cualquiera (aunque no
 * sea técnico) pueda aportar los links de WhatsApp/Telegram de su sección vía
 * un Pull Request. El detalle completo vive en la documentación de GitHub. */
import { useStore } from "@nanostores/react";
import { setModal } from "@/lib/cliente/acciones";
import { $v, E } from "@/lib/cliente/estado";
import { IconoAlerta } from "./Iconos";

const REPO = "https://github.com/Ragosorio/NoHayCupo";

const PASOS: { titulo: string; detalle: React.ReactNode }[] = [
  {
    titulo: "Bajá el proyecto y Node",
    detalle: <>Descargá el proyecto desde <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a> e instalá <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">Node.js</a> (es gratis, siguiente-siguiente). No necesitás nada más.</>,
  },
  {
    titulo: "Poné los links en el Excel",
    detalle: <>Usá el Excel de horarios de tu carrera. En la columna <strong>J</strong> pegá el link del grupo de <strong>WhatsApp</strong> de esa sección, y en la <strong>K</strong> el de <strong>Telegram</strong>. Podés poner uno o los dos.</>,
  },
  {
    titulo: "Corré un comando",
    detalle: <>En una terminal, dentro del proyecto:<br /><code>node scripts/grupos/importar.mjs "tu-archivo.xlsx"</code><br />El script revisa que todo calce con el catálogo real. Si algo no cuadra, te dice qué corregir.</>,
  },
  {
    titulo: "Abrí un Pull Request",
    detalle: <>El script actualiza un solo archivo (<code>grupos.json</code>). Subilo con un Pull Request en GitHub y nosotros lo revisamos. ¡Listo, tu grupo queda para toda la facultad!</>,
  },
];

export default function ModalContribuir() {
  useStore($v);
  if (!E.modalContribuir) return null;
  return (
    <div className="modal-fondo no-print"
      onClick={(ev) => { if (ev.target === ev.currentTarget) setModal("contribuir", false); }}>
      <div className="modal-caja modal-contribuir">
        <header className="modal-header">
          <div>
            <h2>Subí el grupo de tu sección</h2>
            <p className="modal-sub">Aportar es fácil y ayuda a toda la facultad.</p>
          </div>
          <button className="btn btn-icono" title="Cerrar" onClick={() => setModal("contribuir", false)}>✕</button>
        </header>

        <div className="modal-contribuir-cuerpo">
          <ol className="pasos">
            {PASOS.map((p, i) => (
              <li key={i} className="paso">
                <span className="paso-n">{i + 1}</span>
                <div className="paso-txt">
                  <strong>{p.titulo}</strong>
                  <p>{p.detalle}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="curso-disclaimer">
            <IconoAlerta />
            <p>
              Solo aceptamos links de <strong>WhatsApp</strong> y <strong>Telegram</strong>, y
              cada uno se valida contra el catálogo oficial: nada que no coincida con un
              curso y sección reales entra a la app.
            </p>
          </div>

          <a className="btn btn-primary btn-ancho-auto" href={`${REPO}/blob/main/scripts/grupos/README.md`}
            target="_blank" rel="noopener noreferrer">
            Ver la guía completa en GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
