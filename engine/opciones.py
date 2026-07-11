"""Construcción de opciones inscribibles por curso.

Pasos:
  1. Filtrar secciones restringidas que el usuario no marcó como aplicables
     (nunca se descartan en silencio: se genera una advertencia).
  2. Agrupar secciones equivalentes por (inicio, fin, días) — mismo horario,
     distinto catedrático.
  3. Producto cartesiano entre la clase y CADA componente práctico obligatorio
     (Laboratorio, Práctica, etc.), descartando combinaciones internas con
     traslape. Esto detecta trampas tipo "la clase choca con TODOS los labs".
"""
from __future__ import annotations

from itertools import product

from .models import COMPONENTE_CLASE, Componente, Curso, Opcion, Seccion, Sesion, min_to_hhmm, ordenar_dias
from .overlap import sesiones_se_traslapan


def agrupar_por_horario(secciones: list) -> list:
    """Agrupa secciones por (inicio, fin, dias) idénticos -> lista de grupos,
    cada grupo con sus secciones equivalentes (mismo horario, distinto profesor)."""
    grupos = {}
    for sec in secciones:
        key = (sec.inicio_min, sec.fin_min, sec.dias)
        grupos.setdefault(key, []).append(sec)
    return list(grupos.values())


def _filtrar(secciones: list, incluir_restringidas: set, advertencias: list,
             curso: Curso, nombre_comp: str) -> list:
    """Aplica los filtros de elegibilidad a un componente y explica qué quitó."""
    con_horario = [s for s in secciones if s.tiene_horario]
    if len(con_horario) < len(secciones):
        advertencias.append(
            f"{curso.codigo}: {len(secciones) - len(con_horario)} sección(es) de "
            f"{nombre_comp} sin horario definido en el catálogo; se ignoraron.")

    elegibles = [s for s in con_horario
                 if not s.restringida or s.seccion in incluir_restringidas]
    restringidas_fuera = [s.seccion for s in con_horario
                          if s.restringida and s.seccion not in incluir_restringidas]
    if restringidas_fuera and not elegibles:
        advertencias.append(
            f"{curso.codigo} ({nombre_comp}): TODAS las secciones disponibles son "
            f"restringidas ({', '.join(restringidas_fuera)}). 'Ver Restricciones' no "
            f"significa no disponible — si alguna aplica a tu carrera/pénsum, "
            f"márcala como permitida.")
    return elegibles


def build_opciones_curso(curso: Curso, incluir_restringidas: set = frozenset()):
    """Devuelve (opciones, advertencias) para un curso.

    Cada opción es un combo completo clase + un horario de cada componente
    práctico, ya validado internamente sin traslapes.
    """
    advertencias = []

    # Componentes en orden: clase primero (si existe), luego prácticos.
    # Un curso puede no tener clase magistral (ej. cursos que son solo lab).
    componentes = []
    if curso.secciones_clase:
        componentes.append((COMPONENTE_CLASE, curso.secciones_clase))
    for categoria, secs in curso.componentes_practicos.items():
        componentes.append((categoria, secs))

    grupos_por_componente = []
    for nombre_comp, secs in componentes:
        elegibles = _filtrar(secs, incluir_restringidas, advertencias, curso, nombre_comp)
        grupos = agrupar_por_horario(elegibles)
        if not grupos:
            # Sin este componente el curso no se puede inscribir completo.
            return [], advertencias
        grupos_por_componente.append((nombre_comp, grupos))

    opciones = []
    # Rastrea qué grupos de clase lograron al menos un combo válido, para
    # avisar explícitamente "esta sección choca con TODOS los laboratorios".
    grupos_clase_con_salida = set()

    for eleccion in product(*[grupos for _, grupos in grupos_por_componente]):
        comps, sesiones = [], []
        valido = True
        for (nombre_comp, _), grupo in zip(grupos_por_componente, eleccion):
            rep = grupo[0]
            sesion = Sesion(rep.inicio_min, rep.fin_min, rep.dias)
            if sesiones_se_traslapan([sesion], sesiones):
                valido = False
                break
            sesiones.append(sesion)
            comps.append(Componente(categoria=nombre_comp, sesion=sesion, secciones=grupo))
        if valido:
            opciones.append(Opcion(componentes=comps))
            grupos_clase_con_salida.add(id(eleccion[0]))

    # Advertencia explícita para clases incompatibles con todos sus prácticos
    # (la trampa que motivó este proyecto — ver SPEC.md sección 8).
    if len(grupos_por_componente) > 1:
        for grupo in grupos_por_componente[0][1]:
            if id(grupo) not in grupos_clase_con_salida:
                rep = grupo[0]
                secs = "/".join(s.seccion for s in grupo)
                dias = " ".join(ordenar_dias(rep.dias))
                practicos = ", ".join(n for n, _ in grupos_por_componente[1:])
                advertencias.append(
                    f"{curso.codigo} sección {secs} ({dias} "
                    f"{min_to_hhmm(rep.inicio_min)}–{min_to_hhmm(rep.fin_min)}) se "
                    f"traslapa con TODAS las secciones de {practicos}: es "
                    f"matemáticamente imposible de inscribir completa.")

    if not opciones:
        advertencias.append(
            f"{curso.codigo}: ninguna combinación interna de clase + componentes "
            f"prácticos es posible sin traslape.")
    return opciones, advertencias
