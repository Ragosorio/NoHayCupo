"""Detección de traslapes entre sesiones (día + rango horario)."""
from __future__ import annotations


def sesiones_se_traslapan(a: list, b: list) -> bool:
    """True si alguna sesión de `a` se traslapa en día+horario con alguna de `b`.

    Dos sesiones que solo se tocan (una termina 10:30 y la otra empieza 10:30)
    NO se consideran traslape: la comparación es estricta.
    """
    for s1 in a:
        for s2 in b:
            if s1.dias & s2.dias:
                if s1.inicio_min < s2.fin_min and s2.inicio_min < s1.fin_min:
                    return True
    return False
