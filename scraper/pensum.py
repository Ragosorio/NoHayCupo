"""Parser de la red de estudios (pénsum) -> lista de cursos con prerrequisitos.

Estructura verificada contra el HTML real de redesestudio.ingenieria.usac.edu.gt
(Ingeniería en Ciencias y Sistemas, pénsum 28):

  - Cada semestre es una tarjeta `card-red-curricular` cuyo encabezado
    `header-red-title` trae el ordinal en un <small> ("PRIMER", "SEGUNDO", ...).
  - Cada curso es una fila `body-red-curricular` con:
      * `body-red-area` con atributo area="N" (2..5) — área temática, solo color.
      * `body-red-codigo-division` <small> → código ("0768").
      * <small creditos="N"> → créditos.
      * `body-red-descripcion` <small> → nombre.
      * `body-red-prerrequisito-item` (0..n) → códigos de cursos prerrequisito.
        En la red de estudios TODOS los prerrequisitos listados deben estar
        aprobados para poder asignarse el curso.
"""
from __future__ import annotations

from html.parser import HTMLParser

ORDINALES = {
    "PRIMER": 1, "SEGUNDO": 2, "TERCER": 3, "CUARTO": 4, "QUINTO": 5,
    "SEXTO": 6, "SÉPTIMO": 7, "OCTAVO": 8, "NOVENO": 9, "DÉCIMO": 10,
    # por si el sitio los escribe sin tilde
    "SEPTIMO": 7, "DECIMO": 10,
}


class _PensumParser(HTMLParser):

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cursos = []
        self._pila = []           # clases CSS de los divs abiertos
        self._semestre = None
        self._curso = None        # dict del curso en construcción
        self._en_small = False
        self._small_creditos = None
        self._texto = []

    # -- helpers de contexto --
    def _en(self, clase):
        return any(clase in c for c in self._pila)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div":
            clases = attrs.get("class", "")
            self._pila.append(clases)
            if "body-red-curricular" in clases:
                self._cerrar_curso()
                self._curso = {"codigo": None, "nombre": "", "creditos": None,
                               "semestre": self._semestre, "area": None,
                               "prerrequisitos": []}
            elif "body-red-area" in clases and self._curso is not None:
                area = attrs.get("area")
                if area and area.isdigit():
                    self._curso["area"] = int(area)
        elif tag == "small":
            self._en_small = True
            self._small_creditos = attrs.get("creditos")
            self._texto = []

    def handle_endtag(self, tag):
        if tag == "div" and self._pila:
            self._pila.pop()
        elif tag == "small" and self._en_small:
            self._en_small = False
            texto = " ".join("".join(self._texto).split())
            self._procesar_small(texto)

    def handle_data(self, data):
        if self._en_small:
            self._texto.append(data)

    def _procesar_small(self, texto):
        if not texto:
            return
        if self._en("header-red-title"):
            # el encabezado trae dos <small>: "PRIMER" y "SEMESTRE"
            if texto.upper() in ORDINALES:
                self._semestre = ORDINALES[texto.upper()]
            return
        if self._curso is None:
            return
        if self._small_creditos is not None:
            self._curso["creditos"] = int(self._small_creditos)
        elif self._en("body-red-codigo-division"):
            self._curso["codigo"] = texto
        elif self._en("body-red-descripcion"):
            self._curso["nombre"] = (self._curso["nombre"] + " " + texto).strip()
        elif self._en("body-red-prerrequisito-item") and texto.isdigit():
            self._curso["prerrequisitos"].append(texto)

    def _cerrar_curso(self):
        if self._curso and self._curso["codigo"]:
            self.cursos.append(self._curso)
        self._curso = None

    def close(self):
        super().close()
        self._cerrar_curso()


def parse_pensum(html: str) -> list:
    """Parsea el HTML de la red de estudios -> list[dict] con
    codigo, nombre, creditos, semestre (1-10), area, prerrequisitos."""
    parser = _PensumParser()
    parser.feed(html)
    parser.close()
    return parser.cursos


def cursos_elegibles(pensum: list, aprobados: set) -> list:
    """Cursos que el estudiante puede asignarse: no aprobados y con TODOS sus
    prerrequisitos aprobados. (La misma lógica vive en el frontend; esta copia
    existe para poder probarla contra los datos reales.)"""
    return [c for c in pensum
            if c["codigo"] not in aprobados
            and all(p in aprobados for p in c["prerrequisitos"])]
