---
name: nueva-estrategia
description: Agregar una nueva estrategia de ranking de horarios (ej. "menos huecos", "tardes libres") al motor de NoHayCupo. Usar cuando se quiera un criterio nuevo de ordenamiento de combinaciones.
---

# Agregar una estrategia de ranking

Una estrategia NO filtra combinaciones (eso es del solver y los bloqueos):
solo las ORDENA. Vive completa en `engine/strategies.py`.

## Pasos

1. Si tu criterio necesita un dato que las métricas no calculan, agregalo a
   `compute_metrics()` (se calcula UNA vez por combinación; mantenelo O(n)).
2. Escribí la función de score. Contrato:
   - Recibe `metrics` y devuelve una TUPLA donde **mayor = mejor**.
   - El PRIMER elemento siempre es `-metrics["minutos_en_evitar"]` — las
     preferencias de tiempo del usuario dominan sobre el sabor de la
     estrategia; tu criterio desempata después.
   ```python
   def score_mi_estrategia(metrics: dict) -> tuple:
       """Una línea que explique el criterio."""
       return (-metrics["minutos_en_evitar"], <tu criterio>, <desempate>)
   ```
3. Registrala en `ESTRATEGIAS` con id snake_case, `nombre` corto (2–3 palabras,
   así cabe en las tabs) y `descripcion` de una línea en voseo.
4. El frontend la muestra solo — las tabs se generan del API, no hay que tocar JS.
5. Test en `tests/test_cases_reales.py`: armá un escenario con los fixtures
   reales donde tu estrategia elige claramente distinto que las demás, y
   afirmá esa diferencia (ver `test_estrategia_maximo_dia_libre_elige_viernes`
   como plantilla). También agregala a la lista del test
   `test_todas_las_estrategias_rankean_sin_error` (corre solo, itera ESTRATEGIAS).
6. `python3 -m unittest discover tests -v` y una pasada visual con la skill
   `verificar-app` (la tab nueva aparece, rankea, y el nombre no rompe el layout).
