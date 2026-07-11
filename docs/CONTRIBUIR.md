# Contribuir a NoHayCupo

## Correr el proyecto

```bash
python3 -m ui.app          # http://localhost:8765 — cero dependencias, solo stdlib
python3 -m unittest discover tests -v
```

Si estás en Claude Code, hay skills listas en `.claude/skills/` (verificar la
app, actualizar fixtures, agregar una estrategia).

## Reglas de la casa

1. **El scraper es la única fuente de verdad.** Ningún horario, aula ni
   restricción se escribe a mano en código o tests: los fixtures son recortes
   del HTML real (`tests/fixtures/`). Ya nos mordió una vez confiar en datos
   "de memoria" — está contado en SPEC.md sección 8.
2. **`engine/` se queda puro.** Sin red, sin disco, sin DOM. Si tu cambio en el
   motor necesita I/O, va en otra capa.
3. **Nunca descartar en silencio.** Si una sección/curso queda fuera
   (restricción, bloqueo, traslape imposible), el usuario recibe una
   advertencia que explica por qué.
4. **Sin dependencias nuevas en la versión Python.** Es stdlib a propósito:
   cualquier estudiante la corre con el Python que trae su máquina.
5. **Ser amable con los sitios de la facultad.** Todo fetch pasa por el caché
   de `scraper/fetch.py`; no bajes los TTL sin una razón fuerte.
6. **UI sin emojis** — íconos SVG (en `ui/static/icons/` o inline con
   `stroke="currentColor"`). Español, voseo, tono directo.

## Antes de abrir un PR

- `python3 -m unittest discover tests` en verde.
- Si tocaste UI: levantá el server y probá el flujo completo (elegir cursos →
  generar → cambiar estrategia → editor → exportar). El tema claro Y el oscuro.
- Si tocaste el scraper: corré el parser contra el HTML cacheado real
  (`data/cache/`), no solo contra los fixtures.

## Mapa del código

Está en [ARQUITECTURA.md](ARQUITECTURA.md). La migración a
Astro/Vercel está planificada en [PLAN-MIGRACION.md](PLAN-MIGRACION.md).
