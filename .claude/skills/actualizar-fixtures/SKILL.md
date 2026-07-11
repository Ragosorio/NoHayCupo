---
name: actualizar-fixtures
description: Regenerar los fixtures de tests desde el HTML real de los sitios de la USAC cuando cambia el semestre o el layout de las tablas. Usar cuando los tests fallan por datos desactualizados o al iniciar un nuevo ciclo.
---

# Actualizar fixtures desde datos reales

**Regla inquebrantable:** los fixtures se RECORTAN del HTML real descargado,
jamás se escriben a mano (SPEC.md sección 8). Si un test espera un horario, ese
horario tiene que existir en el sitio de la facultad.

## Pasos

1. Refrescar el caché real:
   ```python
   from scraper.fetch import fetch_html, fetch_pensum
   fetch_html("2", force_refresh=True)      # o "1", "v1", "v2"
   fetch_pensum(28, force_refresh=True)     # 28 = Sistemas CLAR 2025
   ```
2. Regenerar `tests/fixtures/muestra.html`: filtrar del HTML cacheado las
   filas `<tr>` de los cursos de prueba (0768, 0147, 0550) y envolverlas con
   el MISMO `<thead>` de la tabla original (el parser resuelve columnas por
   nombre de `<th>` — sin thead no parsea).
3. Regenerar `tests/fixtures/pensum_muestra.html`: recorte desde la primera
   `card-red-curricular` hasta el cierre de la última tarjeta.
4. Verificar paridad recorte vs completo antes de confiar:
   ```python
   parse_secciones(fixture) == [s for s in parse_secciones(completo)
                                if s.curso_codigo in {"0768","0147","0550"}]
   ```
5. Correr `python3 -m unittest discover tests -v`. Si un caso real cambió de
   verdad (la facultad movió una sección), actualizar la aserción Y el
   comentario del test explicando el dato nuevo, citando qué se vio en el HTML.

## Cuándo sospechar del layout (no de los datos)

Si `parse_secciones` devuelve 0 secciones o días imposibles, el sitio pudo
cambiar columnas (ya pasó: vacaciones usa Edificio/Salón en vez de Modalidad).
Revisar los `<th>` reales y ajustar `_mapa_columnas` en `scraper/parse.py`;
agregar el layout nuevo como fixture propio.
