"""Modelo de datos normalizado de NoHayCupo.

Nota sobre la generalización de laboratorios: el SPEC original modelaba
`secciones_lab` como una sola lista, pero al verificar contra el catálogo
real (semestre 2, 2026) apareció el caso 0550 Vías Terrestres 1, que tiene
DOS componentes prácticos distintos a la vez (Práctica + Laboratorio) además
de la clase magistral. Por eso `Curso` guarda `componentes_practicos` como
dict {categoría -> secciones} y el motor hace producto cartesiano entre
TODOS los componentes, no solo clase x laboratorio.
"""
from __future__ import annotations

from dataclasses import dataclass, field

DIAS_SEMANA = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"]
DIAS_LABORALES = ["LU", "MA", "MI", "JU", "VI"]

# Etiqueta usada para el componente de clase magistral (categoria=None)
COMPONENTE_CLASE = "Clase"


def hhmm_to_min(s: str) -> int:
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def min_to_hhmm(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def ordenar_dias(dias) -> list:
    """Devuelve los días en orden de la semana (LU primero)."""
    return sorted(dias, key=DIAS_SEMANA.index)


@dataclass(frozen=True)
class Seccion:
    """Una fila de la tabla de horarios, ya normalizada."""
    curso_codigo: str          # "0768"
    curso_nombre: str          # "INTRODUCCION A LOS ALGORITMOS Y FLUJO DE DATOS"
    seccion: str               # "C", "A+", "_1"...
    categoria: str | None      # None = clase magistral; "Laboratorio", "Práctica",
                               # "Trabajo Dirigido" o "Dibujo" si trae estrella.
    modalidad: str             # "PRESENCIAL" / "SEMIPRESENCIAL"
    inicio_min: int | None     # minutos desde medianoche; None si no tiene horario
    fin_min: int | None
    dias: frozenset            # frozenset({"MA", "JU"})
    catedratico: str
    auxiliar: str | None       # None si "SIN AUXILIAR"
    restringida: bool          # Detalle == "Ver Restricciones"

    @property
    def es_practico(self) -> bool:
        return self.categoria is not None

    @property
    def tiene_horario(self) -> bool:
        return (self.inicio_min is not None
                and self.fin_min is not None
                and self.fin_min > self.inicio_min
                and bool(self.dias))


@dataclass
class Curso:
    codigo: str
    nombre: str
    secciones_clase: list = field(default_factory=list)
    # {categoria -> list[Seccion]}, ej. {"Laboratorio": [...], "Práctica": [...]}
    componentes_practicos: dict = field(default_factory=dict)

    @property
    def tiene_practico(self) -> bool:
        return bool(self.componentes_practicos)

    def todas_las_secciones(self) -> list:
        out = list(self.secciones_clase)
        for secs in self.componentes_practicos.values():
            out.extend(secs)
        return out


@dataclass(frozen=True)
class Sesion:
    """Un bloque de tiempo recurrente: ej. Martes y Jueves 07:10-08:50."""
    inicio_min: int
    fin_min: int
    dias: frozenset


@dataclass
class Componente:
    """Un componente elegido dentro de una opción: la clase, o un laboratorio,
    práctica, etc. Agrupa las secciones equivalentes (mismo horario exacto,
    distinto catedrático) para poder sugerir 'intenta A; si se llena, B'."""
    categoria: str             # COMPONENTE_CLASE, "Laboratorio", "Práctica"...
    sesion: Sesion
    secciones: list            # list[Seccion] equivalentes, en orden de catálogo

    @property
    def principal(self) -> Seccion:
        return self.secciones[0]


@dataclass
class Opcion:
    """Una alternativa concreta e inscribible para un curso: la clase junto a
    un horario de cada componente práctico obligatorio, sin traslapes internos."""
    componentes: list          # list[Componente]

    @property
    def sesiones(self) -> list:
        return [c.sesion for c in self.componentes]

    @property
    def etiqueta(self) -> str:
        partes = []
        for c in self.componentes:
            dias = " ".join(ordenar_dias(c.sesion.dias))
            partes.append(f"{c.categoria} {c.principal.seccion} · {dias} "
                          f"{min_to_hhmm(c.sesion.inicio_min)}–{min_to_hhmm(c.sesion.fin_min)}")
        return "  +  ".join(partes)
