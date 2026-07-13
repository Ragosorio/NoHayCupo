# AGENTS.md — reglas para modificar NoHayCupo (humanos con IA incluidos)

Si vas a tocar este repo con Claude, Copilot, Cursor o cualquier agente:
dale este archivo como contexto. Resume la arquitectura y los invariantes
que NO se negocian.

## Qué es esto

Generador de horarios para FIUSAC (USAC). La app real es **`web/`**
(Astro 5 + islas React + Tailwind 4 + nanostores). El Python de la raíz
(`engine/`, `scraper/`, `ui/`) es la implementación de referencia del motor y
el oráculo de los tests de paridad — no se borra y casi nunca se toca.

## Mapa rápido (web/)

| Ruta | Qué es | Regla |
|---|---|---|
| `src/lib/engine/` | Motor de combinaciones (TS puro) | Sin red, sin DOM. Si lo tocás, regenerá el oráculo (`python3 -m scripts.exportar_paridad` en la raíz) y `npm test` debe quedar 100 % en verde. |
| `src/lib/scraper/` | Parsers del HTML de la facultad | Solo lo importan los endpoints. Columnas SIEMPRE por nombre de `<th>`. |
| `src/pages/api/` | Endpoints serverless | Solo scrapean y cachean (`Cache-Control: s-maxage`); errores con `no-store`. **No crear endpoints de cómputo**: la generación corre en el navegador. |
| `src/lib/cliente/estado.ts` | Estado global | Objeto mutable `E` + átomo `$v`. Las acciones mutan `E` y llaman `touch()`; los componentes hacen `useStore($v)` y leen `E`. Nada de estado de app en `useState` (solo UI efímera). |
| `src/lib/cliente/acciones.ts` | Toda la lógica del frontend | Las islas React solo llaman funciones de acá. |
| `src/lib/cliente/temas.ts` | Registro de temas | Ver `docs/TEMAS.md`. Los componentes NO conocen temas por nombre. |
| `src/lib/cliente/compartir.ts` | Horarios compartidos | Todo viaja en la URL (`#amigo=base64url`); no inventar backend para esto. |
| `src/data/grupos.json` + `src/lib/cliente/grupos.ts` | Grupos WhatsApp/Telegram por sección (aporte comunitario) | El JSON se GENERA con `scripts/grupos/importar.mjs` (nunca a mano) y solo guarda `codigo→seccion→{whatsapp,telegram}`. El navegador **revalida** cada link con regex estricto antes de mostrarlo (solo `chat.whatsapp.com/…` y `t.me/…`). Mantener el regex en sincronía con `scripts/grupos/validar.mjs`. |
| `scripts/grupos/` | Importador comunitario (Node, cero deps) | `lib-xlsx.mjs` (lector .xlsx propio, zip+xml), `validar.mjs` (puro, testeado en `web/tests/grupos-script.test.mjs`), `importar.mjs` (CLI). Valida CADA fila con link contra el catálogo oficial; si no calza, no escribe nada. Solo acepta links de WhatsApp/Telegram. |
| `src/lib/cliente/ia/` | Asistente IA local | El modelo corre en el navegador (Prompt API de Chrome o WebLLM/WebGPU); **jamás** llamar una API de IA externa. El modelo solo PROPONE acciones en JSON (schema restringido en `prompt.ts`); `herramientas.ts` las valida contra el catálogo real y ejecuta las funciones de `acciones.ts`. `@mlc-ai/web-llm` se importa SOLO dinámico (el chunk de 5.8 MB no puede entrar al bundle inicial). Temas fuera de horario/app/Ragosorio → plantilla fija `MENSAJE_FUERA_DE_TEMA`. |
| `src/components/` | Islas React | Solo render + llamadas a acciones. |
| `src/styles/global.css` | Design system | TODO el color por tokens CSS (`--fondo`, `--acento`…). Los componentes usan clases de acá; Tailwind solo para layout puntual en JSX. No duplicar clases existentes. |

## Invariantes (romper cualquiera = PR rechazado)

1. **Ningún dato de horarios escrito a mano.** Fixtures de tests = recortes del
   HTML real de los sitios de la USAC. Jamás transcribir secciones/horas.
2. **Paridad motor TS ↔ Python al 100 %** (`web/tests/paridad.test.ts`).
3. **La generación corre en el navegador.** Cero costo de servidor por usuario;
   los endpoints solo sirven catálogo cacheable por la CDN.
4. **Sin cuentas, sin DB, sin tracking.** El estado del estudiante vive en
   `localStorage` (clave `nhc`). Compartir horarios va por URL.
5. **Privacidad del carnet:** las reglas de restricción se bajan crudas y se
   evalúan en el navegador; el carnet no se manda a ningún servidor propio.
6. **Nunca descartar en silencio:** si un curso/sección queda fuera, el usuario
   recibe una advertencia que explica por qué.
7. **UI sin emojis** — íconos SVG inline (`src/components/Iconos.tsx`).
   Español con voseo guatemalteco, tono directo.
8. **Accesibilidad de temas:** contraste tinta/fondo ≥ 7:1 y
   acento-tinta/acento ≥ 4.5:1; animaciones respetan `prefers-reduced-motion`.
9. **Sin dependencias nuevas sin justificación fuerte.** El .xlsx se genera con
   un zip hecho a mano a propósito; la versión Python es 100 % stdlib.

## Cómo verificar antes de terminar

```bash
cd web
./node_modules/.bin/tsc --noEmit -p .   # limpio (salvo tests/paridad, tipos de node)
npm test                                # 9/9 paridad
npm run build                           # build Vercel en verde
```

Flujo manual mínimo (dev server en :4321): agregar cursos 0768 + 0147 →
Generar → cambiar estrategia → Ajustar → mover un curso → Listo («Mi horario»)
→ recargar (todo se restaura) → probar en viewport móvil (375px, drawer con
hamburguesa/✕) → cambiar un par de temas.

## Dónde va cada tipo de cambio

- **Nueva estrategia de ranking** → `.claude/skills/nueva-estrategia/` (motor
  Python primero, luego puerto TS + paridad).
- **Nuevo tema visual** → `docs/TEMAS.md` / `.claude/skills/nuevo-tema/`.
- **Cambio de scraping / semestre nuevo** → `.claude/skills/actualizar-fixtures/`.
- **SEO** → `web/src/pages/index.astro` (head + FAQ + JSON-LD),
  `web/public/llms.txt`, `robots.txt`, `sitemap.xml`. El dominio canónico está
  en `astro.config.mjs` (`site`).
