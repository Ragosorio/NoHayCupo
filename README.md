# NoHayCupo

Optimizador de horarios para la Facultad de Ingeniería USAC. Descarga el
catálogo público de horarios, genera **todas** las combinaciones sin traslapes
para tus cursos (clase + laboratorio/práctica como unidad obligatoria) y las
rankea con 4 estrategias, con plan B por si una sección se llena.

Además integra la **red de estudios de Ingeniería en Ciencias y Sistemas**
(pénsum 28): marcás qué cursos ya aprobaste y la app calcula qué podés llevar
(prerrequisitos cumplidos), te avisa si un curso elegible no tiene oferta este
semestre, y agrega todos los elegibles a tu plan con un clic.

**Cero dependencias**: solo Python 3 (stdlib). No hay `pip install`.

## Cómo correrlo

```bash
cd NoHayCupo
python3 -m ui.app          # abre http://localhost:8765
# o en otro puerto:
python3 -m ui.app --port 9000
```

Después en el navegador:

1. **Abrí tu pénsum** (panel 1) y marcá lo que ya aprobaste. El botón
   *"＋ Agregar los N que podés llevar"* mete a tu plan todos los cursos con
   prerrequisitos cumplidos que sí tienen oferta este semestre.
2. O **buscá y agregá** cursos a mano (por código o nombre). Si agregás uno
   con prerrequisitos pendientes, el chip te lo advierte.
3. Si un curso tiene secciones *"Ver Restricciones"*, marcá las que aplican a
   tu carrera — no se descartan solas.
4. **Generar horarios** → compará las 4 estrategias en pestañas, cambiá entre
   las top-3 opciones de cada una, y revisá el panel *"Si una sección se llena"*.
5. **Exportar / Imprimir** usa el diálogo de impresión del navegador (guardá
   como PDF).

El catálogo se cachea 6 horas en `data/cache/` (el pénsum, 30 días); el botón
*"↻ Actualizar catálogo"* fuerza la re-descarga. Tu selección de cursos y tus
cursos aprobados quedan guardados en el navegador (localStorage).

## Tests

```bash
python3 -m unittest discover tests -v
```

Los tests corren contra `tests/fixtures/muestra.html`, un recorte del HTML
**real** del catálogo (cursos 0768, 0147 y 0550) — los casos documentados en
SPEC.md sección 2.4 y el Addendum.

## Estructura

```
scraper/   fetch (descarga+caché) y parse (HTML -> modelos)
engine/    modelos, traslapes, opciones por curso, solver, estrategias
ui/        servidor stdlib + frontend estático (index.html, app.js, styles.css)
data/      caché del HTML por semestre
tests/     casos reales como fixtures
```

Ver [SPEC.md](SPEC.md) para el diseño completo y las trampas conocidas de la
fuente de datos.
