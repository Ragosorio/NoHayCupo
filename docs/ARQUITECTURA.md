# Arquitectura actual de NoHayCupo

Mapa para entender dónde está cada cosa **hoy** (versión Python + vanilla JS).
El plan para la versión web deployable está en [PLAN-MIGRACION.md](PLAN-MIGRACION.md).

## Vista de pájaro

```
┌─────────────┐   HTML crudo   ┌──────────┐   Seccion/Curso   ┌────────┐
│ Sitios USAC │ ─────────────> │ scraper/ │ ────────────────> │ engine │
└─────────────┘   (con caché)  └──────────┘                   └───┬────┘
                                                                  │ combos + métricas
                                                              ┌───▼────┐
                                                              │ ui/    │ http://localhost:8765
                                                              └────────┘
```

- **`scraper/`** — la única puerta a los sitios de la facultad.
  - `fetch.py`: descarga con caché en disco (`data/cache/`). Catálogo 6 h,
    pénsum 30 días. Sin red usa el caché vencido en vez de fallar.
    Periodos: `1`/`2` = `/horarios/semestre/{n}`, `v1`/`v2` = `/horarios/vacaciones/{n}`.
  - `parse.py`: tabla HTML → `Seccion`. Resuelve columnas **por nombre de
    `<th>`** porque semestre y vacaciones tienen layouts distintos.
  - `pensum.py`: red de estudios → cursos con semestre, créditos y
    prerrequisitos.
  - `restricciones.py`: detalle de "Ver Restricciones" (endpoint AJAX público)
    + evaluación automática contra carnet/carrera.
  - `escanear_pensums.py`: barrido de ids de pénsum → `data/pensums.json`.

- **`engine/`** — lógica pura, sin red ni disco. Portable tal cual a otro lenguaje.
  - `models.py`: dataclasses (`Seccion`, `Curso`, `Sesion`, `Componente`, `Opcion`).
  - `overlap.py`: traslape día+hora (tocarse NO es traslape).
  - `opciones.py`: agrupa secciones equivalentes y arma el producto
    clase × cada componente práctico (un curso puede tener Práctica Y Lab).
  - `solver.py`: backtracking con poda; los bloqueos «imposible» entran como
    tiempo pre-ocupado. También `variantes_emergencia` (plan B).
  - `strategies.py`: métricas por combinación + 4 estrategias de ranking.
    Todas minimizan primero los minutos en bloqueos «mejor no».

- **`ui/`** — servidor stdlib (`app.py`, sin dependencias) + frontend estático.
  - API: `GET /api/catalogo`, `GET /api/pensum`, `POST /api/generar`,
    `POST /api/restricciones`.
  - `static/app.js`: TODO el frontend (estado, render, calendario, editor,
    export). El estado del usuario vive en `localStorage` (clave `nhc`).
  - `static/styles.css`: temas claro/oscuro vía `data-theme`.

- **`tests/`** — unittest. Los fixtures son **recortes del HTML real** de los
  sitios (política del proyecto: nunca transcribir horarios a mano; ver
  SPEC.md sección 8).

## Flujo de una generación

1. Usuario elige cursos (o el pénsum se los sugiere por prerrequisitos).
2. `POST /api/generar` con cursos + secciones restringidas permitidas +
   bloqueos (imposible/mejor-no).
3. `opciones.py` arma las opciones por curso (filtrando restringidas no
   permitidas y opciones que pisan bloqueos imposibles → advertencias).
4. `solver.py` encuentra TODAS las combinaciones sin traslape.
5. `strategies.py` las evalúa una vez y las rankea 4 veces (una por estrategia).
6. Si no hay solución: sugerencias de sacrificio (qué curso quitar destraba
   cuántas combinaciones).
7. El frontend pinta calendario, métricas, plan B; el editor permite mover
   cursos a otras secciones que quepan.

## Trampas conocidas (no re-aprenderlas)

Ver los addendums de [SPEC.md](../SPEC.md). Las que más muerden:

- La celda "Días" es UN string ("MA JU"); vacaciones cambia columnas.
- "Ver Restricciones" ≠ inelegible: depende de carnet/carrera; jamás
  auto-descartar sin avisar.
- Clase+lab son una unidad; una clase puede ser incompatible con TODOS los labs.
- En redesestudio el id numérico manda; el slug de la URL es decorativo.
- CSS: un `display:flex` en la clase le gana al atributo `hidden` — usar
  `.clase[hidden] { display:none }` (ya nos pasó dos veces).
