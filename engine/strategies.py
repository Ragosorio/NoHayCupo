"""Métricas por combinación y puntuación por estrategia.

Generalizado: ya no existe una "ventana laboral" fija. El estudiante define
bloqueos con dos niveles de prioridad:

  - nivel "imposible": tiempo intocable. Se filtra en el solver (una
    combinación que lo pise ni siquiera existe), no aquí.
  - nivel "evitar": "mejor si no se usa". Se mide en `minutos_en_evitar` y
    TODAS las estrategias lo minimizan como primer criterio; el sabor de cada
    estrategia decide entre las combinaciones que empatan.

Todas las llaves de puntuación son "mayor es mejor" (se ordena reverse=True).
"""
from __future__ import annotations

from .models import DIAS_LABORALES

# Franja del día usada para calcular huecos/bloques libres (no es una
# restricción, solo el lienzo de las métricas).
DIA_INICIO_MIN = 7 * 60
DIA_FIN_MIN = 19 * 60


def _minutos_traslape(sesion, bloqueos) -> int:
    """Minutos-semana en que `sesion` pisa la lista de bloqueos."""
    total = 0
    for b in bloqueos:
        dias_comunes = len(sesion.dias & b.dias)
        if dias_comunes:
            solapa = max(0, min(sesion.fin_min, b.fin_min) - max(sesion.inicio_min, b.inicio_min))
            total += solapa * dias_comunes
    return total


def compute_metrics(combinacion: list, bloqueos_evitar: list = ()) -> dict:
    sesiones_por_dia = {d: [] for d in DIAS_LABORALES}
    usa_sabado = False
    usa_domingo = False
    minutos_en_evitar = 0

    for _, opcion in combinacion:
        for s in opcion.sesiones:
            minutos_en_evitar += _minutos_traslape(s, bloqueos_evitar)
            for d in s.dias:
                if d in sesiones_por_dia:
                    sesiones_por_dia[d].append((s.inicio_min, s.fin_min))
                elif d == "SA":
                    usa_sabado = True
                elif d == "DO":
                    usa_domingo = True

    dias_con_clase = {d for d in DIAS_LABORALES if sesiones_por_dia[d]}
    dias_libres = set(DIAS_LABORALES) - dias_con_clase

    def bloque_libre_mas_largo(dia):
        ocupado = sorted(sesiones_por_dia[dia])
        libres = []
        cursor = DIA_INICIO_MIN
        for (ini, fin) in ocupado:
            ini_c, fin_c = max(ini, DIA_INICIO_MIN), min(fin, DIA_FIN_MIN)
            if ini_c > cursor:
                libres.append(ini_c - cursor)
            cursor = max(cursor, fin_c)
        if cursor < DIA_FIN_MIN:
            libres.append(DIA_FIN_MIN - cursor)
        return max(libres) if libres else (DIA_FIN_MIN - DIA_INICIO_MIN)

    bloques = {d: bloque_libre_mas_largo(d) for d in DIAS_LABORALES}

    # Fin de la última clase e inicio de la primera, por día laboral.
    # Día sin clases: fin=0 (mejor imposible para "salir temprano") e
    # inicio=DIA_FIN_MIN (mejor imposible para "entrar tarde").
    fin_por_dia = {d: max((fin for _, fin in sesiones_por_dia[d]), default=0)
                   for d in DIAS_LABORALES}
    inicio_por_dia = {d: min((ini for ini, _ in sesiones_por_dia[d]), default=DIA_FIN_MIN)
                      for d in DIAS_LABORALES}

    return {
        "minutos_en_evitar": minutos_en_evitar,
        "dias_con_clase": dias_con_clase,
        "dias_libres": dias_libres,
        "num_dias_con_clase": len(dias_con_clase),
        "usa_sabado": usa_sabado,
        "usa_domingo": usa_domingo,
        "bloques_libres_por_dia": bloques,
        "suma_bloques_libres": sum(bloques.values()),
        "min_bloque_libre": min(bloques.values()),
        "suma_fin_ultima_clase": sum(fin_por_dia.values()),
        "suma_inicio_primera_clase": sum(inicio_por_dia.values()),
    }


def score_manana_compacta(metrics: dict) -> tuple:
    """Salir de clases lo más temprano posible cada día."""
    return (-metrics["minutos_en_evitar"], -metrics["suma_fin_ultima_clase"])


def score_empezar_tarde(metrics: dict) -> tuple:
    """Entrar a clases lo más tarde posible (mañanas libres)."""
    return (-metrics["minutos_en_evitar"], metrics["suma_inicio_primera_clase"])


def score_maximo_dia_libre(metrics: dict) -> tuple:
    """Concentrar las clases en pocos días; días completos sin clase."""
    return (-metrics["minutos_en_evitar"], -metrics["num_dias_con_clase"],
            metrics["suma_bloques_libres"])


def score_bloques_mixtos(metrics: dict) -> tuple:
    """Bloques libres continuos grandes y parejos entre días."""
    return (-metrics["minutos_en_evitar"], metrics["suma_bloques_libres"],
            metrics["min_bloque_libre"])


ESTRATEGIAS = {
    "manana_compacta": {
        "nombre": "Salir temprano",
        "descripcion": "Terminar clases lo antes posible cada día.",
        "score": score_manana_compacta,
    },
    "empezar_tarde": {
        "nombre": "Entrar tarde",
        "descripcion": "Empezar clases lo más tarde posible.",
        "score": score_empezar_tarde,
    },
    "maximo_dia_libre": {
        "nombre": "Máximo día libre",
        "descripcion": "Concentrar clases en pocos días.",
        "score": score_maximo_dia_libre,
    },
    "bloques_mixtos": {
        "nombre": "Bloques libres",
        "descripcion": "Huecos libres grandes y parejos entre días.",
        "score": score_bloques_mixtos,
    },
}


def evaluar(combinaciones: list, bloqueos_evitar: list = ()) -> list:
    """Calcula las métricas una sola vez por combinación -> [(combo, metrics)]."""
    return [(combo, compute_metrics(combo, bloqueos_evitar)) for combo in combinaciones]


def rankear(evaluadas: list, estrategia_id: str, top_n: int = 3) -> list:
    """Ordena [(combo, metrics)] según la estrategia y devuelve las top_n."""
    score = ESTRATEGIAS[estrategia_id]["score"]
    return sorted(evaluadas, key=lambda par: score(par[1]), reverse=True)[:top_n]
