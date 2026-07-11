"""Detalle de restricciones de secciones — endpoint público POST /restricciones.

El sitio de horarios expone el detalle de cada "Ver Restricciones" vía AJAX
(sin autenticación, solo pide el header X-Requested-With). Devuelve HTML con
uno o más <strong> con reglas. Patrones verificados (semestre 2, 2026):

  - "SOLO PARA ESTUDIANTES CON CARNE FINALIZADO EN: 0,2,4,6,8"
        -> regla por último dígito del carnet.
  - "SE PERMITEN ESTUDIANTES DE: INGENIERIA EN CIENCIAS Y SISTEMAS"
        -> regla por carrera; si hay varias líneas de este tipo son un OR.
  - "SECCION PARA ESTUDIANTES REPITENTES DEL CURSO"
        -> condición que solo el estudiante puede responder (se reporta como
           'revisar', nunca se decide automáticamente).

Semántica combinada: los tipos distintos se exigen todos (AND); dentro del
tipo carrera basta cumplir una (OR).
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

RESTRICCIONES_URL = "https://usuarios.ingenieria.usac.edu.gt/restricciones"
CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"


def extraer_params_restricciones(html_catalogo: str):
    """Extrae (anio, periodo) de las llamadas verRestricciones(...) del catálogo.
    Devuelve (None, None) si el semestre no tiene secciones restringidas."""
    m = re.search(r"verRestricciones\('[^']+'\s*,\s*'[^']+',\s*'([^']+)',\s*'([^']+)'\)",
                  html_catalogo)
    return (m.group(1), m.group(2)) if m else (None, None)


def _cache_file(anio, periodo) -> Path:
    return CACHE_DIR / f"restricciones_{anio}_{periodo}.json"


def _leer_cache(anio, periodo) -> dict:
    path = _cache_file(anio, periodo)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            return {}
    return {}


def _guardar_cache(anio, periodo, datos: dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _cache_file(anio, periodo).write_text(
        json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")


def fetch_restriccion(codigo, seccion, anio, periodo, timeout=30) -> list:
    """Descarga y parsea las reglas de una sección. Devuelve list[str].
    Las restricciones de un periodo no cambian: caché en disco permanente."""
    cache = _leer_cache(anio, periodo)
    clave = f"{codigo}|{seccion}"
    if clave in cache:
        return cache[clave]

    datos = urllib.parse.urlencode({
        "codigo": codigo, "seccion": seccion, "anio": anio, "periodo": periodo,
    }).encode()
    req = urllib.request.Request(RESTRICCIONES_URL, data=datos, headers={
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "NoHayCupo/1.0 (herramienta personal de horarios)",
    })
    html = urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")
    reglas = parse_reglas(html)

    cache[clave] = reglas
    _guardar_cache(anio, periodo, cache)
    return reglas


def parse_reglas(html: str) -> list:
    """Extrae los textos de las reglas (<strong>...</strong>) del modal."""
    reglas = []
    for bloque in re.findall(r"<strong>(.*?)</strong>", html, re.S):
        texto = " ".join(re.sub(r"<[^>]+>", " ", bloque).split())
        if texto:
            reglas.append(texto)
    return reglas


# ---------- Evaluación automática ----------

RE_CARNET = re.compile(r"CARNE\w*\s+FINALIZADO\s+EN\s*:?\s*([\d,\s]+)", re.I)
RE_CARRERA = re.compile(r"SE\s+PERMITEN\s+ESTUDIANTES\s+DE\s*:?\s*(.+)", re.I)


def _norm_carrera(s: str) -> str:
    """Mayúsculas, sin tildes y con espacios colapsados, para comparar carreras."""
    import unicodedata
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", s)
                         if not unicodedata.combining(c))
    return " ".join(sin_tildes.upper().split())


def evaluar_reglas(reglas: list, carnet: str = "", carrera: str = "CIENCIAS Y SISTEMAS") -> dict:
    """Evalúa las reglas contra el carnet/carrera del estudiante.

    Devuelve {"veredicto": "aplica"|"no_aplica"|"revisar", "detalle": [str]}.
    Solo decide en firme lo que se puede verificar; cualquier regla que no se
    entiende deja el veredicto en 'revisar' (nunca descarta en silencio).
    """
    carnet_digitos = re.sub(r"\D", "", carnet or "")
    ultimo = carnet_digitos[-1] if carnet_digitos else None

    detalle = []
    fallo = False
    duda = False
    carreras_permitidas = []

    for regla in reglas:
        m = RE_CARNET.search(regla)
        if m:
            permitidos = {d.strip() for d in m.group(1).split(",") if d.strip().isdigit()}
            if ultimo is None:
                duda = True
                detalle.append(f"Pide carnet terminado en {','.join(sorted(permitidos))} — ingresá tu carnet para verificar.")
            elif ultimo in permitidos:
                detalle.append(f"✓ Tu carnet termina en {ultimo} (pide {','.join(sorted(permitidos))}).")
            else:
                fallo = True
                detalle.append(f"✗ Tu carnet termina en {ultimo} y esta sección pide {','.join(sorted(permitidos))}.")
            continue
        m = RE_CARRERA.search(regla)
        if m:
            carreras_permitidas.append(m.group(1).strip())
            continue
        duda = True
        detalle.append(f"Condición que debés confirmar vos: “{regla}”")

    if carreras_permitidas:
        objetivo = _norm_carrera(carrera or "")
        # Nombre completo ("INGENIERIA ...") exige igualdad exacta — un match
        # por substring haría que "INGENIERIA MECANICA" aceptara secciones de
        # "INGENIERIA MECANICA INDUSTRIAL". El substring queda solo para
        # objetivos parciales (compatibilidad con "CIENCIAS Y SISTEMAS").
        def _acepta(c):
            cn = _norm_carrera(c)
            return cn == objetivo or (not objetivo.startswith("INGENIERIA") and objetivo in cn)
        if objetivo and any(_acepta(c) for c in carreras_permitidas):
            detalle.append(f"✓ Permite tu carrera ({carrera}).")
        else:
            fallo = True
            detalle.append("✗ Solo permite: " + "; ".join(carreras_permitidas) + ".")

    veredicto = "no_aplica" if fallo else ("revisar" if duda else "aplica")
    return {"veredicto": veredicto, "detalle": detalle, "reglas": reglas}
