"""Búsqueda de combinaciones válidas (backtracking DFS con poda temprana).

Portado del motor construido a mano: ir asignando curso por curso y, en
cuanto una opción se traslapa con lo ya elegido, no seguir por esa rama.
"""
from __future__ import annotations

from .overlap import sesiones_se_traslapan


def find_all_valid_combinations(requisitos: list, sesiones_bloqueadas: list = (),
                                max_resultados: int = 200_000) -> list:
    """
    requisitos: list[tuple[str, list[Opcion]]] — (codigo_curso, sus opciones).
    sesiones_bloqueadas: list[Sesion] con los bloqueos nivel "imposible" del
    estudiante — se tratan como tiempo ya ocupado, así ninguna combinación
    los pisa jamás.

    Devuelve list[list[tuple[str, Opcion]]]: todas las combinaciones sin
    traslapes, cada una como lista de (codigo_curso, opcion_elegida) en el
    mismo orden en que llegaron los requisitos.

    Internamente explora primero los cursos con menos opciones (los más
    restringidos) — no cambia la corrección, pero poda mucho antes.
    """
    orden = sorted(range(len(requisitos)), key=lambda i: len(requisitos[i][1]))
    resultados = []

    def dfs(pos, elegidos, sesiones_ocupadas):
        if len(resultados) >= max_resultados:
            return
        if pos == len(orden):
            resultados.append(list(elegidos))
            return
        idx = orden[pos]
        nombre, opciones = requisitos[idx]
        for op in opciones:
            if not sesiones_se_traslapan(op.sesiones, sesiones_ocupadas):
                elegidos.append((nombre, op))
                dfs(pos + 1, elegidos, sesiones_ocupadas + op.sesiones)
                elegidos.pop()

    dfs(0, [], list(sesiones_bloqueadas))

    # Restaurar el orden original de los cursos dentro de cada combinación.
    posicion = {nombre: i for i, (nombre, _) in enumerate(requisitos)}
    return [sorted(combo, key=lambda par: posicion[par[0]]) for combo in resultados]


def variantes_emergencia(combinacion: list, requisitos: list,
                         sesiones_bloqueadas: list = ()) -> dict:
    """Para cada curso de una combinación elegida: qué OTRAS opciones de ese
    curso caben sin mover el resto del horario ("si la sección se llena").
    Respeta también los bloqueos "imposible" del estudiante.

    Devuelve {codigo_curso: list[Opcion] compatibles, orden del catálogo}.
    """
    opciones_por_curso = dict(requisitos)
    elegida_por_curso = dict(combinacion)
    out = {}
    for codigo, opcion_actual in combinacion:
        resto = list(sesiones_bloqueadas)
        for otro, op in combinacion:
            if otro != codigo:
                resto.extend(op.sesiones)
        alternativas = [
            op for op in opciones_por_curso[codigo]
            if op is not elegida_por_curso[codigo]
            and not sesiones_se_traslapan(op.sesiones, resto)
        ]
        out[codigo] = alternativas
    return out
