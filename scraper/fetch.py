"""Descarga del catálogo público de horarios de FIUSAC, con caché en disco.

La página NO requiere autenticación: es una tabla HTML renderizada del lado
del servidor con todos los cursos de la facultad. El scraper es la única
fuente de verdad — nunca transcribir horarios a mano (SPEC.md sección 8).
"""
from __future__ import annotations

import time
import urllib.request
from pathlib import Path

BASE_URL = "https://usuarios.ingenieria.usac.edu.gt/horarios/semestre/{id}"

# Red de estudios (pénsum) — pública, renderizada del servidor, sin login.
# El {id} numérico decide carrera+plan+vigencia (el slug de la URL es
# cosmético); el catálogo de ids vive en data/pensums.json (ver
# scraper/escanear_pensums.py). 28 = Ciencias y Sistemas CLAR 2025.
PENSUM_URL = ("https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio/"
              "ingenieriaEnCienciasYSistemas/{id}/clar")
PENSUM_ID_DEFAULT = 28

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"

# Los horarios cambian durante el periodo de asignación; 6 horas de caché es
# un balance razonable entre frescura y no golpear el sitio en cada clic.
CACHE_TTL_HORAS = 6.0

# El pénsum cambia (con suerte) una vez por año.
PENSUM_TTL_HORAS = 24.0 * 30


def cache_path(semestre_id) -> Path:
    return CACHE_DIR / f"semestre_{semestre_id}.html"


def fetch_url(url: str, nombre_cache: str, ttl_horas: float,
              force_refresh: bool = False, timeout: int = 60):
    """Descarga `url` con caché en disco. Devuelve (html, desde_cache, timestamp).

    Usa el archivo cacheado si existe y tiene menos de `ttl_horas`, salvo que
    force_refresh sea True. Si la descarga falla pero hay caché (aunque esté
    vencido), cae al caché en lugar de reventar.
    """
    path = CACHE_DIR / nombre_cache
    if path.exists():
        edad_horas = (time.time() - path.stat().st_mtime) / 3600
        if not force_refresh and edad_horas < ttl_horas:
            return path.read_text(encoding="utf-8"), True, path.stat().st_mtime

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "NoHayCupo/1.0 (herramienta personal de horarios)"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except OSError:
        if path.exists():  # sin red: mejor caché viejo que nada
            return path.read_text(encoding="utf-8"), True, path.stat().st_mtime
        raise

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    return html, False, time.time()


def fetch_html(semestre_id, force_refresh: bool = False, timeout: int = 60):
    """Catálogo de horarios del semestre. Devuelve (html, desde_cache, timestamp)."""
    return fetch_url(BASE_URL.format(id=semestre_id), f"semestre_{semestre_id}.html",
                     CACHE_TTL_HORAS, force_refresh, timeout)


def fetch_pensum(pensum_id: int = PENSUM_ID_DEFAULT, force_refresh: bool = False,
                 timeout: int = 60):
    """Red de estudios del pénsum `pensum_id`. Devuelve (html, desde_cache, ts)."""
    return fetch_url(PENSUM_URL.format(id=pensum_id), f"pensum_{pensum_id}.html",
                     PENSUM_TTL_HORAS, force_refresh, timeout)
