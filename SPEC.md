# Optimizador de Horarios FIUSAC — Especificación Técnica

## 1. Objetivo del proyecto

Herramienta personal que reemplaza el proceso manual que hicimos hoy a mano:

1. Obtener el catálogo de horarios de la Facultad de Ingeniería (USAC) para un semestre.
2. Filtrar los cursos que el usuario necesita.
3. Generar automáticamente combinaciones de horario **sin traslapes**, optimizadas según distintas estrategias (compactar mañanas, maximizar horas laborales libres, maximizar días completamente libres, etc.).
4. Mostrar el resultado en un calendario visual, con alternativas equivalentes y "qué hacer si una sección se llena".

No es para otros estudiantes ni para vender — es una herramienta personal, así que se puede simplificar todo lo que no aporte (no hace falta multi-usuario, ni roles, ni nada de eso).

## 2. Fuente de datos — CONFIRMADO PÚBLICO

URL: `https://usuarios.ingenieria.usac.edu.gt/horarios/semestre/{id}`
(`{id}` identifica el semestre/periodo — probamos `2` y funcionó sin login)

**Esta página NO requiere autenticación.** Es una tabla HTML renderizada del lado del servidor con **todos los cursos de toda la facultad** (no solo los del usuario) — miles de filas. No hay que hacer scraping con navegador headless ni manejar sesión/cookies: un GET simple + parseo de HTML alcanza.

### 2.1 Estructura de la tabla

Columnas (en este orden):

| Columna | Contenido | Notas |
|---|---|---|
| Nombre de Curso | `CÓDIGO NOMBRE DEL CURSO` | El código son los primeros 4 dígitos, ej. `0768 INTRODUCCION A LOS ALGORITMOS Y FLUJO DE DATOS` |
| Sección | Letra o combinación | Ver "sufijos" abajo |
| Modalidad | `PRESENCIAL` / `SEMIPRESENCIAL` | Informativo, no afecta el horario |
| Inicio | `HH:MM` | |
| Final | `HH:MM` | |
| Días | Abreviaturas separadas por espacio en **una sola celda** | `LU MA MI JU VI SA DO` — ej. `"MA JU"` significa Martes y Jueves. **Distinto al sistema de asignación autenticado**, que mostraba columnas separadas con "X". Aquí hay que hacer `.split()` sobre un solo string. |
| Catedrático | Nombre completo | |
| Auxiliar | Nombre completo o `SIN AUXILIAR` | |
| Detalle | `Sin restricciones` / `Ver Restricciones` | Botón/badge |

### 2.2 Íconos especiales junto al nombre del curso

Vimos hasta 4 categorías marcadas con una estrella de color junto al nombre:

- **Laboratorio** (azul)
- **Trabajo Dirigido** (celeste)
- **Dibujo**
- **Práctica**

Estas filas son la sección de **laboratorio/práctica obligatoria** que acompaña a una clase teórica — son un curso "hermano" que hay que inscribir junto con su clase magistral, en una fila aparte con el mismo código de curso. **Esto es la fuente #1 de traslapes ocultos** (ya nos pasó hoy con Algoritmos): el motor de horarios debe tratar clase+laboratorio como una unidad obligatoria, nunca como cursos independientes opcionales.

### 2.3 Sufijos de sección

- `A`, `B`, `C`... → secciones normales, agrupables como equivalentes si tienen mismo horario+días (solo cambia catedrático).
- `A+`, `A-` → mismo horario pero con **restricción de acceso** distinta (típicamente carrera/pénsum específico). El campo "Detalle" dice `Ver Restricciones`.
- `_1`, `_2`, `.A`, `.B` → variantes que vimos en cursos de otras áreas; tratar igual que letras normales para efectos de agrupar por horario.

**Importante (aprendido hoy):** cuando el campo Detalle dice `Ver Restricciones`, **no** se debe asumir automáticamente que la sección es inelegible — depende del pénsum/carrera del usuario. La app debe dejar que el usuario marque manualmente qué secciones restringidas sí aplican a él, en vez de filtrarlas de forma automática.

### 2.4 Casos confirmados hoy que sirven como datos de prueba

Usar estos cursos reales (semestre 2, 2026) como fixtures/tests, porque ya conocemos el resultado esperado:

- **0768 Introducción a los Algoritmos y Flujo de Datos**, sección **C**: clase viernes 07:10–10:40 (un solo bloque largo); **el laboratorio real de la sección C es SÁBADO 10:30–12:10**, no viernes → sirve como test de "días distintos, cero traslape" y como ejemplo de por qué hay que verificar con capturas reales en vez de asumir por texto.
- **0147 Física Básica**, sección **Z**: sábado 07:10–10:30, único bloque de un solo día en esa oferta — buen test para "maximizar día libre / usar sábado".
- Cursos con **múltiples secciones al mismo horario pero distinto catedrático** — test para "agrupar equivalentes".
- Cursos con **sufijo + / -** en la misma franja horaria pero catedrático distinto (ej. 0550 Vías Terrestres 1-1+ y 1-) — test para "no descartar automáticamente por sufijo".

## 3. Arquitectura (4 módulos independientes)

```
NoHayCupo/
├── scraper/
│   ├── fetch.py          # descarga el HTML crudo de la URL pública (con caché)
│   └── parse.py          # tabla HTML -> Seccion/Curso normalizados
├── engine/
│   ├── models.py         # dataclasses: Seccion, Curso, Sesion, Componente, Opcion
│   ├── overlap.py        # detección de traslapes (día + rango horario)
│   ├── opciones.py       # agrupar equivalentes + producto clase x componentes prácticos
│   ├── solver.py         # backtracking con poda + variantes de emergencia
│   └── strategies.py     # métricas y puntuación por estrategia
├── ui/
│   ├── app.py            # servidor local (stdlib http.server) + API JSON
│   └── static/           # index.html, styles.css, app.js
├── data/
│   └── cache/            # HTML descargado, para no re-scrapear en cada corrida
├── tests/
│   ├── fixtures/muestra.html   # recorte del HTML REAL (0768, 0147, 0550)
│   └── test_cases_reales.py    # los casos de la sección 2.4
└── SPEC.md               # este documento
```

Cada módulo se puede probar por separado. Orden de construcción: scraper (contra HTML real) → engine → UI.

## 4. Modelo de datos normalizado

Ver `engine/models.py`. Cambio respecto al borrador original: `Curso` guarda
`componentes_practicos: dict[categoria -> list[Seccion]]` en lugar de una sola
lista de labs — ver Addendum A2.

## 5. Motor de horarios

1. **Agrupar secciones equivalentes** por `(inicio, fin, días)` — mismo horario, catedrático distinto.
2. Para cursos con componentes prácticos, producto cartesiano clase × cada componente, **descartando combinaciones internas con traslape**, con advertencia explícita cuando una clase choca con TODAS las secciones de un componente.
3. **Backtracking (DFS) con poda temprana**, explorando primero los cursos con menos opciones.
4. Métricas por combinación válida: horas laborales libres (7:00–17:00 L–V), días completamente libres, bloque libre continuo más grande por día, uso de sábado.
5. **4 estrategias de puntuación**: Mañana compacta, Tarde/noche, Máximo día libre, Bloques mixtos.
6. Por combinación elegida: secciones equivalentes (mismo horario, otro catedrático) y "variante de emergencia" (otra opción del curso que cabe sin mover el resto).

## 6. Interfaz (UI)

Página HTML+JS servida localmente por `ui/app.py` (stdlib puro, cero dependencias):

- Semestre configurable + botón "Actualizar catálogo" (caché 6 h).
- Buscador de cursos por código o nombre; secciones restringidas se marcan manualmente por curso.
- Al generar se calculan TODAS las combinaciones y se muestran las 4 estrategias como pestañas, con top-3 opciones cada una.
- Calendario semanal con bloques de color por curso, rayado para laboratorios/prácticas, franja laboral sombreada, columna de sábado solo si se usa.
- Panel "Si una sección se llena": equivalentes + variantes de emergencia.
- Exportar = imprimir/PDF del navegador (hoja de estilos de impresión incluida).

## 7. Decisiones tomadas en la primera sesión

- `{id}` del semestre: editable en la UI (campo "Semestre"); el 2 vigente quedó cacheado.
- Re-scrapeo: caché de 6 horas + botón de refresh manual; si no hay red, cae al caché aunque esté vencido.
- Históricos: no por ahora — el caché por semestre (`data/cache/semestre_{id}.html`) queda como base si algún día se quiere.

## 8. Notas de errores reales que motivaron este proyecto (para no repetirlos)

- Un dato pasado "de memoria" por texto (días de una sección) resultó incorrecto comparado con la captura real del sistema — **el scraper debe ser la única fuente de verdad**, nunca copiar/transcribir a mano.
- Cursos con laboratorio obligatorio pueden tener una sección de clase que es matemáticamente incompatible con **todas** las secciones de laboratorio disponibles — el validador lo detecta y avisa de forma explícita.
- El campo "Ver Restricciones" no significa "no disponible" — depende del pénsum del usuario, así que no se auto-filtra.

---

## Addendum — verificado contra el HTML real (2026-07-09, semestre 2)

**A1. Mapeo exacto de estrellas** (confirmado con la leyenda de la página):
`badge-blue` → Laboratorio · `badge-danger` → Práctica · `badge-info` → Trabajo Dirigido · `badge-success` → Dibujo.
Conteo real: 450 labs, 149 prácticas, 16 trabajos dirigidos, 6 dibujos, en 1,591 filas / 337 cursos.

**A2. Un curso puede tener VARIOS componentes prácticos a la vez.** 0550 Vías
Terrestres 1 tiene Práctica (`1+`/`1-`, ambas restringidas) Y Laboratorio
(`_A`/`_B`) además de la clase. Por eso el motor generaliza a
clase × componente₁ × componente₂ × …, no solo clase × lab.

**A3. Corrección al ejemplo de "equivalentes" del borrador:** 0768 A (Rodas) y
B (Veliz) comparten hora (07:10–08:50) pero **días distintos** (MA JU vs LU MI),
así que NO son equivalentes. El caso real de equivalentes es 0147 P y Q
(LU MA JU VI 14:00–14:50, distinto catedrático).

**A4. Conflicto real encontrado por la herramienta:** la Práctica de 0550
(`1+`/`1-`, SA 07:10–10:30) ocupa exactamente el mismo bloque que Física Básica
Z (SA 07:10–10:30) → si llevás 0550, la sección Z de Física es imposible.

**A5. Tocarse no es traslaparse:** 0147 Z termina 10:30 y los labs de 0768
empiezan 10:30 el mismo sábado — combinación válida (comparación estricta).

**A7. Periodos de vacaciones (2026-07-11).** Además de `/horarios/semestre/{1,2}`
existen `/horarios/vacaciones/{1,2}` (junio/diciembre). La tabla de vacaciones
tiene OTRO layout: columnas `Edificio | Salón` en lugar de `Modalidad` — por
eso el parser resuelve columnas por nombre del `<th>`, nunca por posición.
Un periodo sin catálogo publicado devuelve la tabla vacía (no es error).

**A8. Catálogo de pénsums (2026-07-11).** En redesestudio el `{id}` numérico
decide el contenido y el slug de la URL es cosmético (…/ingenieriaEnCienciasY
Sistemas/27/clar devuelve Ambiental CLAR 2025). `scraper/escanear_pensums.py`
barre los ids y genera `data/pensums.json`: 22 pénsums, 10 carreras, planes
CLAR 2022 y CLAR 2025 (ids 27–28). El año del carnet decide qué plan aplica.

**A6. Red de estudios (pénsum) — segunda fuente pública (2026-07-10).**
`https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio/ingenieriaEnCienciasYSistemas/28/clar`
— también server-rendered y sin login. Estructura: tarjetas `card-red-curricular`
por semestre (ordinal en `header-red-title`); cada curso es una fila
`body-red-curricular` con código (`body-red-codigo-division`), créditos
(`<small creditos="N">`), nombre (`body-red-descripcion`), área temática
(atributo `area="2..5"`, solo decorativo) y prerrequisitos
(`body-red-prerrequisito-item`, todos códigos de curso; TODOS deben estar
aprobados para asignarse). Verificado: 75 cursos, 10 semestres, 335 créditos,
123 relaciones de prerrequisito. Con esto la app calcula elegibilidad
("qué podés llevar"), cruza contra la oferta del semestre y advierte cursos
seleccionados con prerrequisitos pendientes. El pénsum se cachea 30 días
(`data/cache/pensum_sistemas.html`).
