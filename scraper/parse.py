"""Parser de la tabla HTML de horarios -> lista de Seccion normalizadas.

Estructura verificada contra el HTML real (semestre 2, 2026):
  - Tabla con id="tblHorarios"; cada <tr> del tbody es una sección.
  - Columnas: Nombre de Curso | Sección | Modalidad | Inicio | Final | Días
              | Catedrático | Auxiliar | Detalle
  - Los días vienen como texto en UNA celda ("MA  JU") — se hace .split().
  - Una estrella <span class="badge badge-X"> junto al nombre marca el
    componente práctico. Mapeo confirmado con la leyenda de la página:
        badge-blue    -> Laboratorio
        badge-danger  -> Práctica
        badge-info    -> Trabajo Dirigido
        badge-success -> Dibujo
"""
from __future__ import annotations

from html.parser import HTMLParser

from engine.models import Curso, Seccion, hhmm_to_min

BADGE_CATEGORIA = {
    "badge-blue": "Laboratorio",
    "badge-danger": "Práctica",
    "badge-info": "Trabajo Dirigido",
    "badge-success": "Dibujo",
}

COLUMNAS_ESPERADAS = 9


class _TablaHorariosParser(HTMLParser):
    """Extrae las filas de la tabla #tblHorarios como (celdas_texto, badge)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.filas = []
        self._en_tabla = False
        self._tablas_anidadas = 0
        self._en_td = False
        self._celdas = []
        self._texto = []
        self._badge = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "table":
            if self._en_tabla:
                self._tablas_anidadas += 1
            elif attrs.get("id") == "tblHorarios":
                self._en_tabla = True
            return
        if not self._en_tabla or self._tablas_anidadas:
            return
        if tag == "tr":
            self._celdas = []
            self._badge = None
        elif tag == "td":
            self._en_td = True
            self._texto = []
        elif tag == "span" and self._en_td:
            clases = attrs.get("class", "")
            for clase_css, _ in BADGE_CATEGORIA.items():
                if clase_css in clases:
                    self._badge = clase_css

    def handle_endtag(self, tag):
        if not self._en_tabla:
            return
        if tag == "table":
            if self._tablas_anidadas:
                self._tablas_anidadas -= 1
            else:
                self._en_tabla = False
        elif self._tablas_anidadas:
            return
        elif tag == "td":
            self._en_td = False
            self._celdas.append(" ".join("".join(self._texto).split()))
        elif tag == "tr" and self._celdas:
            self.filas.append((self._celdas, self._badge))

    def handle_data(self, data):
        if self._en_td:
            self._texto.append(data)


def _hora_o_none(texto: str):
    try:
        return hhmm_to_min(texto.strip())
    except (ValueError, AttributeError):
        return None


def parse_secciones(html: str) -> list:
    """Parsea el HTML completo del catálogo -> list[Seccion]."""
    parser = _TablaHorariosParser()
    parser.feed(html)

    secciones = []
    for celdas, badge in parser.filas:
        if len(celdas) < COLUMNAS_ESPERADAS:
            continue  # fila rara/incompleta: mejor omitir que inventar datos
        nombre_completo = celdas[0]
        partes = nombre_completo.split(None, 1)
        if not partes or not partes[0].isdigit():
            continue  # toda fila real inicia con el código numérico del curso
        codigo = partes[0]
        nombre = partes[1] if len(partes) > 1 else ""

        auxiliar = celdas[7] or None
        if auxiliar and auxiliar.upper() == "SIN AUXILIAR":
            auxiliar = None

        secciones.append(Seccion(
            curso_codigo=codigo,
            curso_nombre=nombre,
            seccion=celdas[1],
            categoria=BADGE_CATEGORIA.get(badge),
            modalidad=celdas[2],
            inicio_min=_hora_o_none(celdas[3]),
            fin_min=_hora_o_none(celdas[4]),
            dias=frozenset(celdas[5].split()),
            catedratico=celdas[6],
            auxiliar=auxiliar,
            restringida="Ver Restricciones" in celdas[8],
        ))
    return secciones


def agrupar_cursos(secciones: list) -> dict:
    """Agrupa las secciones por código de curso -> {codigo: Curso}.

    Las filas con estrella (Laboratorio/Práctica/...) van a
    componentes_practicos[categoria]; el resto a secciones_clase.
    """
    cursos = {}
    for sec in secciones:
        curso = cursos.get(sec.curso_codigo)
        if curso is None:
            curso = Curso(codigo=sec.curso_codigo, nombre=sec.curso_nombre)
            cursos[sec.curso_codigo] = curso
        if sec.categoria is None:
            curso.secciones_clase.append(sec)
        else:
            curso.componentes_practicos.setdefault(sec.categoria, []).append(sec)
    return cursos
