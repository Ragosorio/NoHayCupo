---
name: verificar-app
description: Levantar NoHayCupo y verificar el flujo completo de la app (cursos, generación, editor, pénsum) después de un cambio. Usar antes de dar por terminada cualquier modificación de UI o del motor.
---

# Verificar NoHayCupo de punta a punta

## Levantar

- Tests primero: `python3 -m unittest discover tests -v` (deben estar TODOS en verde).
- Servidor: preferí el preview de Claude Code (`.claude/launch.json`, nombre
  `nohaycupo`, puerto 8765). Ojo: usa `/opt/homebrew/bin/python3.11` porque el
  python3 de Xcode no puede leer archivos en Desktop (TCC de macOS).
- Si el puerto está ocupado: `lsof -ti :8765 | xargs kill`.

## Flujo mínimo que debe funcionar SIEMPRE

1. Carga inicial: catálogo aparece en el header ("N cursos · …").
2. Buscar `0768` y `0147`, agregarlos → chips con badges correctos.
3. "Generar horarios" → aparecen 4 estrategias, pager de opciones, calendario
   con eventos y plan B. (0768+0147 en semestre 2 = 80 combinaciones.)
4. Cambiar estrategia y opción → el calendario cambia; "Máximo día libre" con
   esos dos cursos debe dar 2 días de clase (usa Física Z de sábado).
5. "Ajustar" → clic en un curso → mover a una alternativa → "Listo" → aparece
   el pill "Mi horario" y la barra de edición DESAPARECE (bug histórico: un
   `display:flex` de clase le gana a `hidden`; verificar con computedStyle).
6. Recargar la página → el horario debe reaparecer solo, con la misma
   estrategia/opción (restauración vía localStorage clave `nhc`).
7. Cambiar Periodo a "Vacaciones junio" → el catálogo cambia (otro layout de
   tabla, columnas Edificio/Salón); "Vacaciones diciembre" fuera de temporada
   muestra "aún no tiene catálogo publicado".
8. Probar tema claro y oscuro (botón sol/luna).

## Cómo verificar sin ojos

Con las herramientas del Browser: `read_page`/`javascript_tool` para asegurar
estado del DOM (elementos `hidden`, textos, conteo de `.evento`), screenshot
solo para el aspecto visual final. Los casos con números esperados están en
`tests/test_cases_reales.py` — si un número difiere, primero sospechá del
catálogo cacheado (`data/cache/`), no del motor.
