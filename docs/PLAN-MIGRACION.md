# Plan de migración — NoHayCupo a Vercel

> Estado: **EJECUTADO (2026-07-11).** La app vive en `web/` (Astro + React +
> Tailwind + nanostores) con paridad 100% verificada contra el motor Python
> (`web/tests/paridad.test.ts`, oráculo de `scripts/exportar_paridad.py`).
> Cambios sobre el plan original: se agregó Tailwind v4 (vía @tailwindcss/vite)
> conviviendo con el design system CSS existente, y /api/restricciones pasó a
> GET por-sección devolviendo reglas CRUDAS (la evaluación contra carnet corre
> en el navegador) para que la CDN pueda cachearlas. La app Python queda en la
> raíz como referencia y fuente del oráculo de paridad.
> Para deployar: importar el repo en Vercel con Root Directory = `web`
> (instrucciones en web/README.md).

## 1. Decisión de framework: Astro

Se evaluaron las tres opciones (Astro, React "solo" con Vite, Next.js):

| Criterio | Astro | React+Vite | Next.js |
|---|---|---|---|
| Endpoints de API en el mismo repo | Sí (`src/pages/api/*.ts`) | No (hay que pegar funciones de Vercel aparte) | Sí (route handlers) |
| Peso del bundle base | Mínimo (islas) | Medio | Mayor (runtime RSC/router) |
| Complejidad para UNA página interactiva | Baja | Baja | Alta para lo que aporta |
| Deploy a Vercel | Adapter oficial `@astrojs/vercel` | Manual | Nativo |
| Curva para colaboradores | Baja | Baja | Media |

**Veredicto: Astro con islas de React y estado compartido en nanostores.**

La honestidad primero: NoHayCupo es *una sola página muy interactiva*, así que
la ventaja clásica de Astro (hidratar poco) se reduce — gran parte de la página
es una isla. Aun así gana porque: (1) trae endpoints serverless TypeScript en
el mismo proyecto, que es exactamente lo que necesita el scraper; (2) el shell,
el modal "Acerca de", el hero y el tour quedan como HTML estático con CSS puro,
cero JS; (3) es lo más liviano y lo más simple de explicar a alguien que entra
al repo; (4) si algún día se agregan páginas de contenido (guía de asignación,
FAQ, blog), Astro las hace gratis. Next.js no aporta nada aquí que justifique
su peso; React solo obliga a mantener las funciones de API por fuera.

## 2. Principio rector: el servidor no calcula, el cliente sí

La decisión de arquitectura más importante para que "no consuma recursos de
nuestro lado":

- **El solver corre en el navegador.** El motor (overlap, opciones, solver,
  estrategias, métricas) se porta a TypeScript puro y se ejecuta en el cliente.
  Ya hoy la mitad existe en JS (`metricasCliente`, `ghostsPara` del editor);
  esto termina esa convergencia y elimina el `/api/generar` del servidor.
  Costo de servidor por usuario que genera horarios: **cero**.
- **El servidor solo sirve datos cacheables**: catálogo parseado, pénsums y
  restricciones. Son JSON que cambian poco y son idénticos para todos los
  usuarios → perfectos para la CDN.

## 3. Arquitectura objetivo

```
NoHayCupo/
├── web/                          # la app Astro (esto es lo que se deploya)
│   ├── astro.config.mjs          # adapter @astrojs/vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro       # shell estático + islas
│   │   │   └── api/
│   │   │       ├── catalogo/[periodo].ts     # scrape+parse -> JSON cacheado
│   │   │       ├── pensum/[id].ts            # red de estudios -> JSON cacheado
│   │   │       └── restricciones.ts          # detalle de una sección restringida
│   │   ├── components/           # islas React, una responsabilidad cada una
│   │   │   ├── PanelPerfil.tsx   # carnet, periodo, carrera, pénsum
│   │   │   ├── PanelCursos.tsx   # buscador + chips de cursos
│   │   │   ├── PanelTiempo.tsx   # pintor de bloqueos imposible/mejor-no
│   │   │   ├── Resultados.tsx    # tabs de estrategias + pager + métricas
│   │   │   ├── Calendario.tsx    # la grilla semanal (y modo edición)
│   │   │   ├── PlanB.tsx         # equivalentes + variantes de emergencia
│   │   │   ├── ModalPensum.tsx
│   │   │   └── Exportar.tsx      # PNG / ICS / prompt IA / imprimir
│   │   ├── lib/
│   │   │   ├── engine/           # TS puro, SIN dependencias de DOM ni de red
│   │   │   │   ├── models.ts     # tipos Seccion, Curso, Sesion, Opcion...
│   │   │   │   ├── overlap.ts
│   │   │   │   ├── opciones.ts
│   │   │   │   ├── solver.ts
│   │   │   │   └── strategies.ts
│   │   │   ├── scraper/          # solo lo usan los endpoints (server-side)
│   │   │   │   ├── catalogo.ts   # fetch + parse tabla (layouts semestre/vacaciones)
│   │   │   │   ├── pensum.ts
│   │   │   │   └── restricciones.ts
│   │   │   └── stores/           # nanostores compartidos entre islas
│   │   │       ├── perfil.ts     # carnet, carrera, periodo, aprobados
│   │   │       ├── plan.ts       # seleccion, restringidas, bloqueos, miHorario
│   │   │       └── resultado.ts  # combos, estrategia/opcion activa
│   │   └── styles/global.css     # el styles.css actual, migrado tal cual
│   ├── tests/                    # Vitest
│   │   ├── fixtures/             # LOS MISMOS fixtures HTML reales de hoy
│   │   ├── engine.paridad.test.ts
│   │   └── scraper.test.ts
│   └── package.json
├── legacy-python/                # el proyecto actual, congelado como referencia
│   └── (scraper/ engine/ ui/ tests/ tal como están hoy)
├── docs/
└── .claude/skills/
```

Reglas de modularidad:
- `lib/engine` no importa nada de red, DOM ni Astro → testeable en aislamiento
  y utilizable igual en cliente y servidor.
- Las islas se comunican SOLO vía stores; ninguna isla importa a otra.
- `localStorage` se toca solo desde los stores (un módulo de persistencia).

## 4. Plan de caching y recursos (Vercel)

El sitio de la facultad es de terceros: hay que pegarle lo MENOS posible.

| Endpoint | Fuente | Cache-Control (CDN) | Efecto |
|---|---|---|---|
| `/api/catalogo/[periodo]` | usuarios.ingenieria… | `s-maxage=21600, stale-while-revalidate=86400` | la CDN responde 6 h sin tocar la función; luego sirve viejo y revalida en fondo |
| `/api/pensum/[id]` | redesestudio… | `s-maxage=2592000, swr=604800` | 30 días; los pénsums cambian una vez al año |
| `/api/restricciones?curso&seccion` | POST /restricciones | `s-maxage=604800, swr=86400` | 7 días por sección; es el único endpoint "multiplicador", cachear agresivo |

- Con esto, aunque entren 10,000 estudiantes en la semana de asignación, el
  sitio de la facultad recibe un puñado de requests al día **en total**, no por
  usuario. La función serverless casi nunca corre → dentro del free tier.
- **Cron opcional de Vercel** (`vercel.json`): 2 invocaciones/día a
  `/api/catalogo/1` y `/2` para precalentar la caché y que nadie espere el
  scrape en frío.
- **Sin base de datos.** Todo lo del usuario (pénsum marcado, bloqueos, horario
  generado) vive en su `localStorage`, igual que hoy. Cero datos personales de
  nuestro lado — eso también es una decisión de privacidad, y se documenta.
- Si algún día la caché de CDN no bastara (p. ej. restricciones muy pedidas en
  frío), el siguiente paso barato es Vercel KV — pero NO se agrega hasta
  necesitarlo.

### Variables de entorno

Definidas en `web/.env.example` (y en el dashboard de Vercel):

```bash
HORARIOS_BASE_URL=https://usuarios.ingenieria.usac.edu.gt
REDES_BASE_URL=https://redesestudio.ingenieria.usac.edu.gt
CACHE_CATALOGO_SEGUNDOS=21600        # 6 h
CACHE_PENSUM_SEGUNDOS=2592000        # 30 días
CACHE_RESTRICCIONES_SEGUNDOS=604800  # 7 días
SCRAPER_USER_AGENT="NoHayCupo/2.0 (github.com/Ragosorio/NoHayCupo)"
```

Cambiar un TTL o la URL base (si la facultad mueve el sitio) = editar una
variable en Vercel, sin tocar código ni redeployar a mano.

## 5. Fases de migración (sin romper nada)

Cada fase termina con tests en verde y la app anterior intacta. El corte a
producción es la última acción, no la primera.

**Fase 0 — Congelar el contrato (½ día).**
Exportar desde Python las salidas "canónicas": para cada fixture real, un JSON
con el catálogo parseado, las opciones por curso, todas las combinaciones
válidas y las métricas. Estos JSON se guardan en `web/tests/fixtures/` y son
el oráculo de la paridad. (Script: `python3 -m scripts.exportar_paridad`.)

**Fase 1 — Esqueleto Astro (½ día).**
`web/` con Astro + adapter Vercel + Vitest + React + nanostores. Deploy
preview a Vercel desde el día uno (el repo actual no se toca). CI: GitHub
Action que corre Vitest en cada push.

**Fase 2 — Motor en TypeScript (1–2 días).** *La fase crítica.*
Portar `engine/` módulo por módulo con sus tests. El test de paridad compara
la salida TS contra los JSON canónicos de la Fase 0: mismas combinaciones, en
el mismo orden, mismas métricas. Hasta que la paridad no esté al 100%, no se
avanza. (El motor son ~400 líneas de lógica pura; es el port más mecánico.)

**Fase 3 — Scraper en TypeScript (1 día).**
`lib/scraper` con parseo por nombre de columna (los DOS layouts: semestre y
vacaciones), pénsum y restricciones. Tests contra los mismos fixtures HTML.
Endpoints `api/*` con los headers de caché de la sección 4.

**Fase 4 — UI por componentes (2–4 días).**
Migrar `app.js` (hoy ~1,700 líneas en un archivo) a las islas de la sección 3,
moviendo el estado a stores. El CSS se migra casi tal cual. Orden sugerido:
Calendario → Resultados → PanelCursos → PanelPerfil/ModalPensum → PanelTiempo
→ Exportar → editor. La paridad visual se verifica con la app Python corriendo
al lado (misma selección → mismo calendario).

**Fase 5 — Corte (½ día).**
- `vercel --prod`, dominio (p. ej. `nohaycupo.ragosorio.com`).
- Mover el Python actual a `legacy-python/` con un README de una línea
  ("versión original; la fuente de verdad de los casos de prueba reales").
- Los datos del usuario migran solos: mismo dominio de localStorage no aplica
  (dominio nuevo), así que la primera visita a producción arranca limpia — se
  avisa en el README y listo.

**Rollback:** en cualquier fase, la app Python local sigue completa y
funcional; en producción, Vercel permite volver al deployment anterior con un
clic.

## 6. Checklist de deploy a Vercel

1. `cd web && npm create astro@latest` ya hecho (Fase 1) con
   `@astrojs/vercel` como adapter y `output: "server"` (los endpoints lo
   requieren; la página igual se prerenderiza con `export const prerender`).
2. Importar el repo en vercel.com → framework preset "Astro", root `web/`.
3. Cargar las variables de entorno de la sección 4.
4. `vercel.json` con los crons de precalentado (opcional).
5. Probar preview: `/api/catalogo/2` responde y el header `age` de la CDN
   crece entre requests (prueba de que la caché trabaja).
6. Dominio + `vercel --prod`.

## 7. Qué NO se hace (a propósito)

- **Sin cuentas ni base de datos** — localStorage alcanza y es mejor promesa
  de privacidad.
- **Sin SSR de la página principal por usuario** — es la misma para todos;
  se prerenderiza.
- **Sin monorepo con workspaces/turbo** — un solo paquete `web/` basta; menos
  fricción para colaboradores.
- **Sin métricas de terceros pesadas** — a lo sumo Vercel Analytics (1 línea).
