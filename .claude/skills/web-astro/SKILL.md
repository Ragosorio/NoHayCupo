---
name: web-astro
description: Trabajar en la versión web de NoHayCupo (web/, Astro + React + Tailwind + nanostores). Correr el dev server, los tests de paridad, el build de Vercel, y las reglas de arquitectura del frontend.
---

# NoHayCupo web (Astro)

## Correr

```bash
cd web
npm install                        # si node_modules no existe
./node_modules/.bin/astro dev --port 4321    # dev server
npm test                           # Vitest (paridad + scraper)
npm run build                      # build con adapter de Vercel
```

Ojo entorno de esta máquina: el caché global de npm tiene archivos de root —
usar `NPM_CONFIG_CACHE=<scratchpad>/npm-cache npm install`. El panel de
preview de Claude Code no puede lanzar node en Desktop (TCC): arrancar el dev
server por Bash y abrir la pestaña con `preview_start {url}`.

## Arquitectura (respetarla)

- `src/lib/engine/` — motor TS PURO (sin red/DOM). Puerto 1:1 del motor Python.
  Cualquier cambio acá exige mantener los tests de paridad al 100%:
  regenerar el oráculo con `python3 -m scripts.exportar_paridad` (raíz) y
  correr `npm test`.
- `src/lib/scraper/` — parsers HTML; solo los importan los endpoints.
- `src/pages/api/` — endpoints serverless con `Cache-Control: s-maxage` (la
  CDN de Vercel absorbe el tráfico). Errores SIEMPRE con `no-store`.
- `src/lib/cliente/` — estado global: objeto mutable `E` + átomo de versión
  `$v` (nanostores). Las acciones mutan E y llaman `touch()`; los componentes
  hacen `useStore($v)` y leen E. NO meter estado de app en useState (solo
  estado efímero de UI como el texto del buscador).
- **La generación corre en el navegador** (`generarCliente.ts`) — no crear
  endpoints de cómputo.
- El CSS de componentes vive en `styles/global.css` (design system por
  variables, mismas clases que la app original); Tailwind se usa para layout
  puntual en JSX. No duplicar: si existe la clase, usarla.

## Verificar cambios de UI

Flujo mínimo (con el dev server corriendo, en el Browser): agregar 0768+0147 →
Generar (espera "80 combinaciones válidas") → cambiar estrategia → Ajustar →
mover un curso → Listo (aparece pill "Mi horario") → recargar (todo se
restaura solo). En React los renders son asíncronos: en tests por consola,
esperar ~150 ms entre clic y aserción.

## Deploy

Vercel con Root Directory = `web`. Post-deploy: `/api/catalogo/2` debe traer
`cache-control: public, s-maxage=...` y el header `age` debe crecer entre
requests (CDN sirviendo caché).
