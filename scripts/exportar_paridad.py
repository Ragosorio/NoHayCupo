"""Fase 0 de la migración: exporta salidas CANÓNICAS del motor Python.

El motor TypeScript debe reproducir estos JSON exactamente (tests de paridad
en web/tests/). Se generan desde los fixtures reales — nunca a mano.

Correr desde la raíz:  python3 -m scripts.exportar_paridad
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from engine.models import Sesion, hhmm_to_min, min_to_hhmm, ordenar_dias
from engine.opciones import build_opciones_curso
from engine.solver import find_all_valid_combinations, variantes_emergencia
from engine.strategies import ESTRATEGIAS, compute_metrics, evaluar, rankear
from scraper.parse import agrupar_cursos, parse_secciones
from scraper.pensum import parse_pensum

FIXTURES = RAIZ / "tests" / "fixtures"
SALIDA = RAIZ / "web" / "tests" / "fixtures"


def _sesion_json(s):
    return {"inicio": min_to_hhmm(s.inicio_min), "fin": min_to_hhmm(s.fin_min),
            "dias": ordenar_dias(s.dias)}


def _seccion_json(s):
    return {
        "curso_codigo": s.curso_codigo, "curso_nombre": s.curso_nombre,
        "seccion": s.seccion, "categoria": s.categoria, "modalidad": s.modalidad,
        "inicio": min_to_hhmm(s.inicio_min) if s.inicio_min is not None else None,
        "fin": min_to_hhmm(s.fin_min) if s.fin_min is not None else None,
        "dias": ordenar_dias(s.dias), "catedratico": s.catedratico,
        "auxiliar": s.auxiliar, "restringida": s.restringida,
    }


def _opcion_json(op):
    return {
        "etiqueta": op.etiqueta,
        "sesiones": [_sesion_json(s) for s in op.sesiones],
        "componentes": [
            {"categoria": c.categoria, "seccion": c.principal.seccion,
             "catedratico": c.principal.catedratico,
             "equivalentes": [{"seccion": s.seccion, "catedratico": s.catedratico}
                              for s in c.secciones[1:]]}
            for c in op.componentes
        ],
    }


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    html = (FIXTURES / "muestra.html").read_text(encoding="utf-8")
    secciones = parse_secciones(html)
    cursos = agrupar_cursos(secciones)

    # 1) Paridad del parser de catálogo
    (SALIDA / "paridad_catalogo.json").write_text(json.dumps(
        [_seccion_json(s) for s in secciones], ensure_ascii=False, indent=1),
        encoding="utf-8")

    # 2) Paridad del parser de pénsum
    pensum = parse_pensum((FIXTURES / "pensum_muestra.html").read_text(encoding="utf-8"))
    (SALIDA / "paridad_pensum.json").write_text(json.dumps(
        pensum, ensure_ascii=False, indent=1), encoding="utf-8")

    # 3) Paridad del motor: opciones por curso (con el caso restringidas de 0550)
    escenarios_opciones = {}
    for codigo, incluir in (("0768", []), ("0147", []), ("0550", ["1+", "N+"])):
        ops, warns = build_opciones_curso(cursos[codigo], incluir_restringidas=set(incluir))
        escenarios_opciones[codigo] = {
            "incluir_restringidas": incluir,
            "advertencias": warns,
            "opciones": [_opcion_json(o) for o in ops],
        }

    # 4) Solver: todas las combinaciones de 0768+0147+0550, como índices de opción
    requisitos = []
    indices = {}
    for codigo in ("0768", "0147", "0550"):
        incluir = {"1+", "N+"} if codigo == "0550" else set()
        ops, _ = build_opciones_curso(cursos[codigo], incluir_restringidas=incluir)
        requisitos.append((codigo, ops))
        indices[codigo] = {id(op): i for i, op in enumerate(ops)}
    combos = find_all_valid_combinations(requisitos)
    combos_idx = [[indices[cod][id(op)] for cod, op in combo] for combo in combos]

    # 5) Métricas con bloqueos «evitar» (ventana laboral clásica LU-VI 7-17)
    evitar = [Sesion(hhmm_to_min("07:00"), hhmm_to_min("17:00"), frozenset([d]))
              for d in ("LU", "MA", "MI", "JU", "VI")]
    metricas = []
    for combo in combos[:10]:
        m = compute_metrics(combo, evitar)
        metricas.append({
            "minutos_en_evitar": m["minutos_en_evitar"],
            "dias_libres": ordenar_dias(m["dias_libres"]),
            "num_dias_con_clase": m["num_dias_con_clase"],
            "usa_sabado": m["usa_sabado"],
            "min_bloque_libre": m["min_bloque_libre"],
            "suma_fin_ultima_clase": m["suma_fin_ultima_clase"],
            "suma_inicio_primera_clase": m["suma_inicio_primera_clase"],
        })

    # 6) Ranking: top-3 por estrategia como índices dentro de `combos`
    evaluadas = evaluar(combos, evitar)
    pos = {id(c): i for i, (c, _) in enumerate(evaluadas)}
    rankings = {eid: [pos[id(c)] for c, _ in rankear(evaluadas, eid, 3)]
                for eid in ESTRATEGIAS}

    # 7) Emergencia del primer combo
    emergencia = variantes_emergencia(combos[0], requisitos)
    emergencia_idx = {cod: [indices[cod][id(op)] for op in ops]
                      for cod, ops in emergencia.items()}

    (SALIDA / "paridad_engine.json").write_text(json.dumps({
        "opciones_por_curso": escenarios_opciones,
        "solver": {"cursos": ["0768", "0147", "0550"],
                   "total_combos": len(combos), "combos": combos_idx},
        "metricas_primeros_10": metricas,
        "bloqueos_evitar": "LU-VI 07:00-17:00",
        "rankings_top3": rankings,
        "emergencia_combo_0": emergencia_idx,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"paridad_catalogo.json: {len(secciones)} secciones")
    print(f"paridad_pensum.json:   {len(pensum)} cursos")
    print(f"paridad_engine.json:   {len(combos)} combos, rankings: {list(rankings)}")


if __name__ == "__main__":
    main()
