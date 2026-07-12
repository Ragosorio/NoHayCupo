# Crear un tema nuevo

NoHayCupo tiene temas intercambiables (claro, azul noche, medianoche, lavanda,
pinky, matcha, cafecito, fútbol, USAC…). Un tema es **solo dos cosas**:

1. Un bloque de variables CSS en `web/src/styles/global.css`.
2. Una entrada de metadata en `web/src/lib/cliente/temas.ts`.

Nada más. Ningún componente conoce los temas por nombre: todo el diseño lee
las variables. Si tu bloque define bien los tokens, TODA la app (calendario,
chips, modales, badges, exportación PNG, favicon) se adapta sola.

## Paso 1 — Tokens CSS

En `global.css`, después de los temas existentes, agregá:

```css
/* Mi tema — una línea que diga su personalidad. */
[data-theme="mitema"] {
  --fondo: …;          /* fondo de la página */
  --tarjeta: …;        /* paneles y tarjetas */
  --tarjeta-2: …;      /* superficies secundarias (chips, celdas de hora) */
  --tinta: …;          /* texto principal */
  --tinta-suave: …;    /* texto secundario */
  --tinta-tenue: …;    /* texto terciario / deshabilitado */
  --borde: …;          /* bordes de tarjetas */
  --linea: …;          /* líneas de la rejilla del calendario */
  --acento: …;         /* color de marca: botones primarios, links, logo */
  --acento-tinta: …;   /* texto SOBRE el acento (botón primario) */
  --acento-suave: …;   /* fondo de hover/selección con el acento */
  --ok-bg: …;  --ok-fg: …;  --ok-borde: …;    /* verde semántico */
  --warn-bg: …; --warn-fg: …; --warn-borde: …; /* amarillo semántico */
  --mal-bg: …;  --mal-fg: …;  --mal-borde: …;  /* rojo semántico */
  --sombra: …;         /* sombra de tarjetas */
}
```

Si el tema es oscuro, sumalo a la lista de `color-scheme: dark` que está al
inicio del archivo (así los controles nativos del navegador salen oscuros):

```css
html[data-theme="dark"], html[data-theme="negro"], …, html[data-theme="mitema"] { color-scheme: dark; }
```

**Reglas de contraste (no negociables):**

- `--tinta` sobre `--fondo` y sobre `--tarjeta`: mínimo 7:1.
- `--tinta-suave` sobre `--tarjeta`: mínimo 4.5:1.
- `--acento-tinta` sobre `--acento`: mínimo 4.5:1 (es el botón "Generar").
- Los tríos ok/warn/mal: `-fg` sobre `-bg` mínimo 4.5:1.
- Verificá en https://webaim.org/resources/contrastchecker/ o con el
  validador del skill de dataviz.

## Paso 2 — Metadata en `temas.ts`

```ts
{
  id: "mitema",            // el mismo string del data-theme
  nombre: "Mi tema",       // como aparece en el picker
  descripcion: "Corto y con personalidad",
  grupo: "Con vibra",      // sección: Clásicos | La cancha | Mundial 2026 | Con vibra | Fandom
  oscuro: false,           // elige la paleta de colores de cursos y el color-scheme
  acento: "#…",            // = --acento (pinta el favicon y el puntito del picker)
  acentoTinta: "#…",       // = --acento-tinta (letras NHC del favicon)
  marco: "#…",             // = --tarjeta (colorea la UI del navegador móvil)
  animacion: undefined,    // opcional, ver abajo
}
```

Regla de oro para los temas "de fandom" (jugadores, marcas, juegos): son
**homenajes con arte propio** — paletas, siluetas y escenas estilizadas.
Nada de sprites, logos ni nombres registrados: el proyecto es open source y
no queremos cartas de abogados.

Con eso el tema ya aparece en el picker del header, se persiste en
localStorage (`nhc.tema`) y el favicon cambia de color al elegirlo.

## Paso 3 — Miniatura del picker

Cada tema se presenta en el picker con una **escena chiquita que lo
representa** (la cancha con pelota, la copa, la florcita…), no con un color
cualquiera. Agregá tu rama en `web/src/components/MiniaturasTemas.tsx`: un
SVG de 24×24 dentro del helper `M` (que pone el fondo redondeado). Si no
agregás rama, el picker cae a un punto del color del acento — funciona, pero
tu tema merece más.

## Paso 4 (opcional) — Animación de bienvenida

Algunos temas saludan al elegirse (la pelota del modo fútbol, la cinta de
peligro del modo USAC, el ajolote del modo cute, la copa de campeones…):

1. En `temas.ts`, poné `animacion: "mianimacion"` en tu entrada (es un id
   libre, sin unions que ampliar).
2. En `web/src/components/Modales.tsx`, agregá tu rama con ese id en el
   `switch` de `AnimacionTema`. El overlay usa la clase `.anim-tema` (fixed,
   `pointer-events: none`, z-index 300) — tu contenido va adentro.
3. Los keyframes van en `global.css` junto a `rodar-pelota` / `flotar` /
   `levantar-copa`.
4. La animación se autodestruye a los ~3.2 s (timer en `cambiarTema`); diseñá
   para ese presupuesto. `prefers-reduced-motion` la desactiva sola — no
   metas información importante ahí.

Consejos de oficio: una sola idea por animación (la copa sube, el corazón se
parte, el personaje se asoma), 2-3 elementos máximo, entrada rápida
(~0.4 s), respiro al medio, salida en fade. Los temas "de marca" (jugador,
banda, país) aguantan más espectáculo; los temas de color puro no necesitan
animación — con el cambio de tokens ya se nota.

## Cómo probarlo

```bash
cd web
./node_modules/.bin/astro dev --port 4321
```

- Elegí tu tema en el picker (ícono de paleta, arriba a la derecha).
- Revisá: calendario con cursos, chips de cursos, modal del pénsum, modal
  Acerca, menú Exportar, y el PNG exportado.
- Probá recargar: el tema debe restaurarse solo.
- Corré `npm test` y `npm run build` antes del PR.
