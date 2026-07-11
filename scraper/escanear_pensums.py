"""Escanea la red de estudios pública para descubrir TODOS los pénsums.

La URL es https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio/<slug>/<id>/clar
donde el <id> numérico decide el contenido (el slug de la URL es cosmético,
pero la ruta exige un slug válido — usamos el de sistemas para todo el barrido;
verificado: id=1 con ese slug devuelve Civil 2022). Un id inexistente responde
con un redirect al índice /redesDeEstudio (urllib lo sigue), así que la señal
de existencia es la frase "Vigente para estudiantes con pensum ...".

Correr:  python3 -m scraper.escanear_pensums [max_id]
Genera:  data/pensums.json  — [{id, slug, carrera, plan, vigencia_desde}]

Lógica de selección para el estudiante (dejada acá para el futuro):
- El año del carnet (primeros 4 dígitos, ej. 202600999 -> 2026) decide el
  pénsum: de su carrera, el de vigencia_desde MÁS RECIENTE con
  vigencia_desde <= año del carnet.
- Si varias entradas empatan en carrera+vigencia (el sitio publica revisiones,
  ej. Sistemas ids 8 y 25 ambas "CLAR 2022"), gana el id MÁS ALTO (revisión
  más reciente).
- Al estudiante solo se le pregunta la carrera; el resto se autodetecta.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

URL = ("https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio/"
       "ingenieriaEnCienciasYSistemas/{id}/clar")
SALIDA = Path(__file__).resolve().parent.parent / "data" / "pensums.json"

RE_VIGENTE = re.compile(
    r"Vigente para estudiantes con pensum\s+(\w+)\s+a partir del a\S+o\s+(\d{4})", re.I)
RE_SLUG = re.compile(r"pensums/([a-z0-9_-]+)/(?:banner|logos|iconos|descripcion)")

NOMBRES = {
    "civil": "Ingeniería Civil",
    "quimica": "Ingeniería Química",
    "mecanica": "Ingeniería Mecánica",
    "industrial": "Ingeniería Industrial",
    "mecanica-industrial": "Ingeniería Mecánica Industrial",
    "sistemas": "Ingeniería en Ciencias y Sistemas",
    "electrica": "Ingeniería Eléctrica",
    "mecanica-electrica": "Ingeniería Mecánica Eléctrica",
    "electronica": "Ingeniería Electrónica",
    "ambiental": "Ingeniería Ambiental",
}


def escanear(max_id: int = 60) -> list:
    encontrados = []
    for i in range(1, max_id + 1):
        try:
            req = urllib.request.Request(URL.format(id=i),
                headers={"User-Agent": "NoHayCupo/1.0 (indexando pensums publicos)"})
            html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")
        except OSError as e:
            print(f"id {i}: error {e}", file=sys.stderr)
            continue
        vig = RE_VIGENTE.search(html)
        if not vig:          # redirect al índice u otra página: el id no existe
            time.sleep(0.4)
            continue
        m = RE_SLUG.search(html)
        slug = m.group(1) if m else None
        reg = {
            "id": i,
            "slug": slug,
            "carrera": NOMBRES.get(slug, (slug or f"id {i}").replace("-", " ").title()),
            "plan": vig.group(1).upper(),
            "vigencia_desde": int(vig.group(2)),
        }
        encontrados.append(reg)
        print(f"id {i}: {reg['carrera']} · {reg['plan']} · desde {reg['vigencia_desde']}")
        time.sleep(0.4)
    return encontrados


if __name__ == "__main__":
    max_id = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    datos = escanear(max_id)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{len(datos)} pénsums -> {SALIDA}")
