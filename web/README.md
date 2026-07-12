# NoHayCupo web — Astro + React + Tailwind

La versión deployable de NoHayCupo. El **solver corre en el navegador** (cero
costo de servidor por usuario); los endpoints solo sirven datos cacheables por
la CDN de Vercel.

## Desarrollo

```bash
cd web
npm install
npm run dev        # http://localhost:4321
npm test           # tests de paridad contra el motor Python
npm run build      # build de producción (adapter de Vercel)
```

## Arquitectura

```
src/
├── pages/
│   ├── index.astro          # shell prerenderizado + islas React
│   └── api/                 # endpoints serverless (scraping cacheado)
│       ├── catalogo/[periodo].ts   # 1|2|v1|v2 → JSON del catálogo
│       ├── pensum/[id].ts          # red de estudios por pénsum
│       ├── pensums.ts              # índice de carreras (estático)
│       └── restricciones.ts        # reglas crudas de una sección
├── components/              # islas React (Header + App y sus piezas)
├── lib/
│   ├── engine/              # motor de horarios (TS puro, corre en el cliente)
│   ├── scraper/             # parsers HTML (corren en el servidor)
│   └── cliente/             # estado (nanostores), acciones, temas,
│                            #   compartir (horarios por URL), export, tour
└── styles/global.css        # Tailwind + design system por tokens CSS
tests/                       # Vitest: paridad 1:1 contra el motor Python
```

Reglas: `lib/engine` no toca red ni DOM; las islas se comunican solo por el
estado compartido; el usuario vive en `localStorage` (sin cuentas, sin DB).
Las reglas completas para agentes/IA están en [../AGENTS.md](../AGENTS.md).

- **Temas**: tokens en `styles/global.css` + registro en `lib/cliente/temas.ts`
  (favicon dinámico incluido). Guía: [../docs/TEMAS.md](../docs/TEMAS.md).
- **Compartir con amigos**: la invitación viaja completa en la URL
  (`#amigo=base64url(JSON)`); ver `lib/cliente/compartir.ts`.
- **SEO**: head + FAQ + JSON-LD en `pages/index.astro`; `public/llms.txt`,
  `robots.txt` y `sitemap.xml`. El dominio canónico vive en `astro.config.mjs`.

## Deploy a Vercel

1. Importar el repo en vercel.com → Root Directory: **web** (preset Astro).
2. (Opcional) cargar variables de `.env.example`.
3. Deploy. Los crons de `vercel.json` precalientan el catálogo 2×/día.

Verificación post-deploy: `/api/catalogo/2` responde JSON y el header `age`
crece entre requests seguidas (la CDN está sirviendo el caché).

## Paridad con el motor Python

`tests/paridad.test.ts` compara este motor contra salidas canónicas del motor
Python original (`python3 -m scripts.exportar_paridad` desde la raíz del
repo). Si tocás el motor, regenerá el oráculo y mantené el 100%.
