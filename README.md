# NoHayCupo

**El generador de horarios de la Facultad de Ingeniería de la USAC.**
Elegís tus cursos, la app calcula **todas** las combinaciones de secciones sin
traslapes usando el catálogo oficial de FIUSAC, y te las rankea con 4
estrategias. Después la ajustás a mano, la compartís con tus amigos para
coincidir en clases, y la exportás a Google Calendar, Excel, PNG o PDF.

**Probala: <https://nohaycupo.vercel.app/>** — gratis, sin cuentas, sin anuncios.
Nada sale de tu navegador.

## Qué hace

| | |
|---|---|
| **Todas las combinaciones** | Backtracking sobre el catálogo real; clase + laboratorio/práctica se inscriben como unidad y jamás chocan. |
| **4 estrategias** | Salir temprano, entrar tarde, máximo día libre, bloques libres parejos. |
| **Tu tiempo manda** | Pintás horas «no puedo» (jamás se usan) y «prefiero no» (se minimizan). |
| **Restricciones por carnet** | Las secciones «Ver Restricciones» se verifican solas con tu número de carnet y carrera. |
| **Pénsum integrado** | Las redes de estudio de las 10 carreras de Ingeniería: marcás lo aprobado y sabe qué podés llevar. |
| **Editor manual** | Mové cualquier curso a otra sección que quepa, con deshacer y «Mi horario». |
| **Plan B** | Si una sección se llena: mismas horas con otro catedrático u otro horario que cabe; badge «crítico» si no hay respaldo. |
| **Con amigos** | Compartí tu horario por link; tu amigo arma el suyo y la app marca en qué clases coinciden. |
| **Exportar** | PNG, Google Calendar (.ics), Excel (.xlsx), PDF y prompt para IA. |
| **Temas** | 13 temas con animaciones de bienvenida (fútbol, USAC, cute, campeones…) — [crear el tuyo](docs/TEMAS.md). |

## Estructura del repo

La app que se deploya es **`web/`** (Astro + islas React + Tailwind; el motor
corre en el navegador). El código Python de la raíz es la **implementación de
referencia del motor** y el oráculo de los tests de paridad — sigue funcionando
(`python3 -m ui.app`), pero el desarrollo activo es la web.

```
web/          ← LA APP (Astro + React + TS; deploy en Vercel)
  src/lib/engine/     motor TS puro (paridad 1:1 con engine/ de Python)
  src/lib/cliente/    estado, acciones, temas, compartir, exportar
  src/components/     islas React
  src/pages/api/      endpoints serverless (scraping cacheado por la CDN)
engine/       motor Python de referencia (puro, sin I/O)
scraper/      descarga + parseo del catálogo, pénsums y restricciones (Python)
ui/           UI local original (stdlib, http://localhost:8765)
scripts/      exportar_paridad.py → regenera el oráculo de los tests de la web
tests/        tests del motor Python (fixtures = HTML real, jamás datos a mano)
docs/         arquitectura, contribución, temas, plan de migración
.claude/      skills para trabajar el repo con agentes (Claude Code)
```

## Correr la web

```bash
cd web
npm install
npm run dev        # http://localhost:4321
npm test           # paridad TS↔Python + scraper
npm run build      # build de producción (adapter de Vercel)
```

Deploy: importar el repo en Vercel con **Root Directory = `web`**. Detalles en
[web/README.md](web/README.md).

## Correr la versión Python (referencia)

```bash
python3 -m ui.app                      # http://localhost:8765 — solo stdlib
python3 -m unittest discover tests -v  # tests del motor
```

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — dónde está cada cosa y cómo fluye una generación.
- [docs/CONTRIBUIR.md](docs/CONTRIBUIR.md) — cómo correr, probar y las reglas de la casa.
- [docs/TEMAS.md](docs/TEMAS.md) — cómo crear un tema visual nuevo (con animación incluida).
- [AGENTS.md](AGENTS.md) — **si vas a modificar el repo con una IA, empezá acá**: arquitectura, invariantes y qué no se toca.
- [SPEC.md](SPEC.md) — diseño completo y trampas conocidas de la fuente de datos.

## Contribuir

PRs bienvenidos. Lo innegociable: los datos de horarios vienen SIEMPRE del
scraper (nunca transcribir horarios a mano), el motor se queda puro (sin red ni
DOM), y si tocás el motor TS los tests de paridad deben seguir al 100 %
(regenerá el oráculo con `python3 -m scripts.exportar_paridad`). El resto está
en [docs/CONTRIBUIR.md](docs/CONTRIBUIR.md).

---

Hecho con ❤ por [ragosorio](https://ragosorio.com/) para la USAC — que esta
vez sí haya cupo.
