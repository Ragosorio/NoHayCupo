"""Servidor local de NoHayCupo — stdlib puro, sin dependencias.

Correr desde la raíz del proyecto:
    python3 -m ui.app            # http://localhost:8765
    python3 -m ui.app --port N   # otro puerto

Sirve la app estática (ui/static/) y una API JSON mínima:
    GET  /api/catalogo?semestre=2&refresh=0|1
    POST /api/generar   {semestre, cursos: [codigos], restringidas: {codigo: [secciones]}}
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# Permitir tanto `python3 -m ui.app` como `python3 ui/app.py`
RAIZ = Path(__file__).resolve().parent.parent
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from engine.models import Sesion, hhmm_to_min, min_to_hhmm, ordenar_dias
from engine.opciones import build_opciones_curso
from engine.overlap import sesiones_se_traslapan
from engine.solver import find_all_valid_combinations, variantes_emergencia
from engine.strategies import ESTRATEGIAS, evaluar, rankear
from scraper.fetch import cache_path, fetch_html, fetch_pensum
from scraper.parse import agrupar_cursos, parse_secciones
from scraper.pensum import parse_pensum
from scraper.restricciones import (evaluar_reglas, extraer_params_restricciones,
                                   fetch_restriccion)

STATIC_DIR = Path(__file__).resolve().parent / "static"

# Caché en memoria del catálogo parseado: {semestre: (cursos, timestamp, desde_cache)}
_catalogos = {}
_pensums = {}          # {pensum_id: (cursos_pensum, timestamp, desde_cache)}
_indice_pensums = None  # contenido de data/pensums.json


def obtener_catalogo(semestre, refresh=False):
    if not refresh and semestre in _catalogos:
        return _catalogos[semestre]
    html, desde_cache, ts = fetch_html(semestre, force_refresh=refresh)
    cursos = agrupar_cursos(parse_secciones(html))
    _catalogos[semestre] = (cursos, ts, desde_cache)
    return _catalogos[semestre]


def indice_pensums():
    """Catálogo de pénsums descubiertos (data/pensums.json, ver
    scraper/escanear_pensums.py). Cacheado en memoria."""
    global _indice_pensums
    if _indice_pensums is None:
        path = RAIZ / "data" / "pensums.json"
        _indice_pensums = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    return _indice_pensums


def obtener_pensum(pensum_id, refresh=False):
    if not refresh and pensum_id in _pensums:
        return _pensums[pensum_id]
    html, desde_cache, ts = fetch_pensum(pensum_id, force_refresh=refresh)
    _pensums[pensum_id] = (parse_pensum(html), ts, desde_cache)
    return _pensums[pensum_id]


def _pensum_json(pensum_id, refresh):
    cursos, ts, desde_cache = obtener_pensum(pensum_id, refresh)
    meta = next((p for p in indice_pensums() if p["id"] == pensum_id), None)
    return {
        "id": pensum_id,
        "carrera": meta["carrera"] if meta else f"pénsum {pensum_id}",
        "plan": meta.get("plan") if meta else None,
        "vigencia_desde": meta.get("vigencia_desde") if meta else None,
        "actualizado": time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)),
        "desde_cache": desde_cache,
        "total_creditos": sum(c["creditos"] or 0 for c in cursos),
        "cursos": cursos,
    }


# ---------- Serialización a JSON ----------

def _seccion_json(s):
    return {
        "seccion": s.seccion,
        "categoria": s.categoria,
        "modalidad": s.modalidad,
        "inicio": min_to_hhmm(s.inicio_min) if s.inicio_min is not None else None,
        "fin": min_to_hhmm(s.fin_min) if s.fin_min is not None else None,
        "dias": ordenar_dias(s.dias),
        "catedratico": s.catedratico,
        "auxiliar": s.auxiliar,
        "restringida": s.restringida,
    }


def _catalogo_json(semestre, refresh):
    cursos, ts, desde_cache = obtener_catalogo(semestre, refresh)
    return {
        "semestre": semestre,
        "actualizado": time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)),
        "desde_cache": desde_cache,
        "total_cursos": len(cursos),
        "cursos": [
            {
                "codigo": c.codigo,
                "nombre": c.nombre,
                "num_secciones": len(c.todas_las_secciones()),
                "tiene_clase": bool(c.secciones_clase),
                "componentes_practicos": sorted(c.componentes_practicos),
                "secciones": [_seccion_json(s) for s in c.todas_las_secciones()],
            }
            for c in sorted(cursos.values(), key=lambda c: c.codigo)
        ],
    }


def _componente_json(comp):
    p = comp.principal
    return {
        "categoria": comp.categoria,
        "seccion": p.seccion,
        "catedratico": p.catedratico,
        "auxiliar": p.auxiliar,
        "restringida": p.restringida,
        "inicio": min_to_hhmm(comp.sesion.inicio_min),
        "fin": min_to_hhmm(comp.sesion.fin_min),
        "dias": ordenar_dias(comp.sesion.dias),
        "equivalentes": [{"seccion": s.seccion, "catedratico": s.catedratico}
                         for s in comp.secciones[1:]],
    }


def _opcion_json(opcion):
    return {"componentes": [_componente_json(c) for c in opcion.componentes],
            "etiqueta": opcion.etiqueta}


def _metrics_json(m, minutos_evitar_totales):
    return {
        "minutos_en_evitar": m["minutos_en_evitar"],
        "horas_en_evitar": round(m["minutos_en_evitar"] / 60, 1),
        "minutos_evitar_totales": minutos_evitar_totales,
        "dias_libres": ordenar_dias(m["dias_libres"]),
        "num_dias_con_clase": m["num_dias_con_clase"],
        "usa_sabado": m["usa_sabado"],
        "min_bloque_libre_h": round(m["min_bloque_libre"] / 60, 1),
    }


def _combo_json(combo, metrics, requisitos, nombres, imposibles, minutos_evitar_totales,
                ids_por_curso):
    emergencia = variantes_emergencia(combo, requisitos, imposibles)
    return {
        "metrics": _metrics_json(metrics, minutos_evitar_totales),
        "cursos": [
            {
                "codigo": codigo,
                "nombre": nombres[codigo],
                "opcion_id": ids_por_curso[codigo][id(opcion)],
                **_opcion_json(opcion),
            }
            for codigo, opcion in combo
        ],
        "emergencia": {codigo: [_opcion_json(op) for op in ops[:3]]
                       for codigo, ops in emergencia.items()},
    }


def _parse_bloqueos(crudos):
    """[{dia, inicio "HH:MM", fin, nivel}] -> (imposibles, evitar) como Sesion."""
    imposibles, evitar = [], []
    for b in crudos or []:
        try:
            sesion = Sesion(hhmm_to_min(b["inicio"]), hhmm_to_min(b["fin"]),
                            frozenset([b["dia"]]))
        except (KeyError, ValueError):
            continue
        (imposibles if b.get("nivel") == "imposible" else evitar).append(sesion)
    return imposibles, evitar


def generar(payload):
    semestre = str(payload.get("semestre", "2")).strip()
    codigos = payload.get("cursos", [])
    restringidas = payload.get("restringidas", {})
    top_n = max(1, min(int(payload.get("top_n", 3)), 25))
    imposibles, evitar = _parse_bloqueos(payload.get("bloqueos"))

    cursos, _, _ = obtener_catalogo(semestre)
    advertencias = []
    requisitos = []
    nombres = {}
    chocan_con_bloqueos = []   # cursos sin NINGUNA opción fuera de lo imposible

    for codigo in codigos:
        curso = cursos.get(codigo)
        if curso is None:
            advertencias.append(f"El curso {codigo} no existe en el catálogo del semestre {semestre}.")
            continue
        nombres[codigo] = curso.nombre
        permitidas = set(restringidas.get(codigo, []))
        opciones, warns = build_opciones_curso(curso, incluir_restringidas=permitidas)
        advertencias.extend(warns)
        if not opciones:
            advertencias.append(
                f"{codigo} {curso.nombre} quedó SIN opciones inscribibles y se excluyó "
                f"de la búsqueda de combinaciones.")
            continue

        # Filtrar contra los bloqueos "imposible" ANTES de resolver, para poder
        # avisar con precisión qué curso es el que no cabe.
        compatibles = [op for op in opciones
                       if not sesiones_se_traslapan(op.sesiones, imposibles)]
        if not compatibles:
            chocan_con_bloqueos.append(codigo)
            advertencias.append(
                f"{codigo} {curso.nombre}: TODAS sus secciones caen dentro de tus "
                f"bloqueos «imposible». Para llevarlo tendrías que liberar tiempo; "
                f"se excluyó de la búsqueda.")
            continue
        requisitos.append((codigo, compatibles))

    combos = find_all_valid_combinations(requisitos, imposibles) if requisitos else []

    # ¿No hay solución? Proponer sacrificios: qué curso quitar destraba cuántas
    # combinaciones (solo se sugiere, la decisión es del estudiante).
    sacrificios = []
    if requisitos and not combos:
        advertencias.append(
            "Con esos cursos y tus bloqueos no existe NINGUNA combinación sin "
            "traslapes. Opciones: liberar bloqueos, habilitar secciones "
            "restringidas, o sacrificar un curso (sugerencias abajo).")
        if len(requisitos) > 1:
            for i, (codigo, _) in enumerate(requisitos):
                resto = requisitos[:i] + requisitos[i + 1:]
                n = len(find_all_valid_combinations(resto, imposibles,
                                                    max_resultados=5000))
                if n:
                    sacrificios.append({"codigo": codigo, "nombre": nombres[codigo],
                                        "combinaciones": n})
            sacrificios.sort(key=lambda s: -s["combinaciones"])

    minutos_evitar_totales = sum((b.fin_min - b.inicio_min) * len(b.dias) for b in evitar)
    evaluadas = evaluar(combos, evitar)
    # Índice estable de cada opción dentro de su curso, para que el editor del
    # frontend pueda referenciar y permutar opciones sin ambigüedad.
    ids_por_curso = {codigo: {id(op): i for i, op in enumerate(ops)}
                     for codigo, ops in requisitos}
    estrategias = []
    for eid, meta in ESTRATEGIAS.items():
        top = rankear(evaluadas, eid, top_n=top_n)
        estrategias.append({
            "id": eid,
            "nombre": meta["nombre"],
            "descripcion": meta["descripcion"],
            "combos": [_combo_json(c, m, requisitos, nombres, imposibles,
                                   minutos_evitar_totales, ids_por_curso)
                       for c, m in top],
        })

    return {
        "total_validas": len(combos),
        "cursos_incluidos": [codigo for codigo, _ in requisitos],
        "excluidos_por_bloqueos": chocan_con_bloqueos,
        "sacrificios": sacrificios,
        "hay_bloqueos": bool(imposibles or evitar),
        "minutos_evitar_totales": minutos_evitar_totales,
        "advertencias": advertencias,
        # Universo completo de opciones por curso (para el editor manual).
        "opciones": {codigo: [_opcion_json(op) for op in ops]
                     for codigo, ops in requisitos},
        "estrategias": estrategias,
    }


# ---------- Restricciones automáticas por carnet ----------

def resolver_restricciones(payload):
    """Para las secciones restringidas de los cursos pedidos: baja el detalle
    (con caché en disco) y lo evalúa contra el carnet/carrera del estudiante."""
    semestre = str(payload.get("semestre", "2")).strip()
    codigos = payload.get("cursos", [])
    carnet = str(payload.get("carnet", "")).strip()
    carrera = str(payload.get("carrera", "")).strip() or "CIENCIAS Y SISTEMAS"

    cursos, _, _ = obtener_catalogo(semestre)
    html_catalogo = cache_path(semestre).read_text(encoding="utf-8")
    anio, periodo = extraer_params_restricciones(html_catalogo)
    if not anio:
        return {"resultados": {}, "nota": "Este semestre no tiene secciones restringidas."}

    resultados = {}
    errores = []
    for codigo in codigos:
        curso = cursos.get(codigo)
        if curso is None:
            continue
        por_seccion = {}
        for s in curso.todas_las_secciones():
            if not s.restringida or s.seccion in por_seccion:
                continue
            try:
                reglas = fetch_restriccion(codigo, s.seccion, anio, periodo)
            except OSError as e:
                errores.append(f"{codigo} {s.seccion}: {e}")
                continue
            por_seccion[s.seccion] = evaluar_reglas(reglas, carnet, carrera)
        if por_seccion:
            resultados[codigo] = por_seccion
    return {"resultados": resultados, "errores": errores}


# ---------- Servidor HTTP ----------

class Handler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _json(self, obj, status=200):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/catalogo":
            q = parse_qs(url.query)
            semestre = q.get("semestre", ["2"])[0]
            refresh = q.get("refresh", ["0"])[0] == "1"
            try:
                self._json(_catalogo_json(semestre, refresh))
            except Exception as e:  # p.ej. sin red y sin caché
                self._json({"error": f"No se pudo obtener el catálogo: {e}"}, 502)
        elif url.path == "/api/pensum":
            q = parse_qs(url.query)
            refresh = q.get("refresh", ["0"])[0] == "1"
            try:
                pid = int(q.get("id", ["28"])[0])
                self._json(_pensum_json(pid, refresh))
            except Exception as e:
                self._json({"error": f"No se pudo obtener el pénsum: {e}"}, 502)
        elif url.path == "/api/pensums":
            self._json({"pensums": indice_pensums()})
        else:
            super().do_GET()

    def do_POST(self):
        url = urlparse(self.path)
        rutas = {"/api/generar": generar, "/api/restricciones": resolver_restricciones}
        manejador = rutas.get(url.path)
        if manejador is None:
            self._json({"error": "ruta desconocida"}, 404)
            return
        try:
            largo = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(largo) or b"{}")
            self._json(manejador(payload))
        except Exception as e:
            self._json({"error": str(e)}, 500)


def main():
    parser = argparse.ArgumentParser(description="NoHayCupo — optimizador de horarios FIUSAC")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"NoHayCupo corriendo en http://localhost:{args.port}  (Ctrl+C para salir)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
