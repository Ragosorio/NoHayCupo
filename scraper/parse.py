"""Parser de la tabla HTML de horarios -> lista de Seccion normalizadas.

Estructura verificada contra el HTML real (semestre 2, 2026):
  - Tabla con id="tblHorarios"; cada <tr> del tbody es una sección.
  - Columnas de SEMESTRE: Nombre de Curso | Sección | Modalidad | Inicio
              | Final | Días | Catedrático | Auxiliar | Detalle
  - Columnas de VACACIONES: igual pero con Edificio | Salón en lugar de
    Modalidad — por eso las columnas se resuelven por NOMBRE del <th>,
    nunca por posición fija.
  - Los días vienen como texto en UNA celda ("MA  JU") — se hace .split().
  - Una estrella <span class="badge badge-X"> junto al nombre marca el
    componente práctico. Mapeo confirmado con la leyenda de la página:
        badge-blue    -> Laboratorio
        badge-danger  -> Práctica
        badge-info    -> Trabajo Dirigido
        badge-success -> Dibujo
"""
from __future__ import annotations

import unicodedata
from html.parser import HTMLParser

from engine.models import Curso, DIAS_SEMANA, Seccion, hhmm_to_min

BADGE_CATEGORIA = {
    "badge-blue": "Laboratorio",
    "badge-danger": "Práctica",
    "badge-info": "Trabajo Dirigido",
    "badge-success": "Dibujo",
}


def _norm(texto: str) -> str:
    """minúsculas y sin tildes, para comparar nombres de columna."""
    sin = "".join(c for c in unicodedata.normalize("NFD", texto)
                  if not unicodedata.combining(c))
    return " ".join(sin.lower().split())


class _TablaHorariosParser(HTMLParser):
    """Extrae las filas de la tabla #tblHorarios como (celdas_texto, badge)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.filas = []
        self.encabezados = []   # textos de los <th>, en orden
        self._en_tabla = False
        self._tablas_anidadas = 0
        self._en_celda = None   # "td" | "th" | None
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
        elif tag in ("td", "th"):
            self._en_celda = tag
            self._texto = []
        elif tag == "span" and self._en_celda == "td":
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
            self._en_celda = None
            self._celdas.append(" ".join("".join(self._texto).split()))
        elif tag == "th":
            self._en_celda = None
            self.encabezados.append(" ".join("".join(self._texto).split()))
        elif tag == "tr" and self._celdas:
            self.filas.append((self._celdas, self._badge))

    def handle_data(self, data):
        if self._en_celda:
            self._texto.append(data)


def _hora_o_none(texto: str):
    try:
        return hhmm_to_min(texto.strip())
    except (ValueError, AttributeError):
        return None


def _mapa_columnas(encabezados: list) -> dict:
    """Resuelve el índice de cada campo por el NOMBRE de la columna, para
    soportar los dos layouts del sitio (semestre y vacaciones)."""
    idx = {_norm(t): i for i, t in enumerate(encabezados)}
    return {
        "nombre": idx.get("nombre de curso", 0),
        "seccion": idx.get("seccion", 1),
        "modalidad": idx.get("modalidad"),          # no existe en vacaciones
        "edificio": idx.get("edificio"),            # solo vacaciones
        "salon": idx.get("salon"),                  # solo vacaciones
        "inicio": idx.get("inicio", 3),
        "fin": idx.get("final", 4),
        "dias": idx.get("dias", 5),
        "catedratico": idx.get("catedratico", 6),
        "auxiliar": idx.get("auxiliar", 7),
        "detalle": idx.get("detalle", 8),
    }


def parse_secciones(html: str) -> list:
    """Parsea el HTML completo del catálogo -> list[Seccion]."""
    parser = _TablaHorariosParser()
    parser.feed(html)
    col = _mapa_columnas(parser.encabezados)
    minimo = max(col["detalle"], col["dias"], col["auxiliar"]) + 1

    def celda(celdas, clave):
        i = col[clave]
        return celdas[i] if i is not None and i < len(celdas) else ""

    secciones = []
    for celdas, badge in parser.filas:
        if len(celdas) < minimo:
            continue  # fila rara/incompleta: mejor omitir que inventar datos
        partes = celda(celdas, "nombre").split(None, 1)
        if not partes or not partes[0].isdigit():
            continue  # toda fila real inicia con el código numérico del curso
        codigo = partes[0]
        nombre = partes[1] if len(partes) > 1 else ""

        auxiliar = celda(celdas, "auxiliar") or None
        if auxiliar and auxiliar.upper() == "SIN AUXILIAR":
            auxiliar = None

        # En vacaciones no hay Modalidad: se usa "Edificio · Salón" como
        # descriptor equivalente (ej. "MEET · VIRTUAL").
        modalidad = celda(celdas, "modalidad")
        if not modalidad:
            lugar = [celda(celdas, "edificio"), celda(celdas, "salon")]
            modalidad = " · ".join(p for p in lugar if p)

        secciones.append(Seccion(
            curso_codigo=codigo,
            curso_nombre=nombre,
            seccion=celda(celdas, "seccion"),
            categoria=BADGE_CATEGORIA.get(badge),
            modalidad=modalidad,
            inicio_min=_hora_o_none(celda(celdas, "inicio")),
            fin_min=_hora_o_none(celda(celdas, "fin")),
            # solo abreviaturas conocidas: si el sitio metiera otra cosa en la
            # celda, mejor un set vacío (sección "sin horario") que un crash
            dias=frozenset(d for d in celda(celdas, "dias").split()
                           if d in DIAS_SEMANA),
            catedratico=celda(celdas, "catedratico"),
            auxiliar=auxiliar,
            restringida="Ver Restricciones" in celda(celdas, "detalle"),
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
