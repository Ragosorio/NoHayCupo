"""Tests contra los casos REALES documentados en SPEC.md sección 2.4.

El fixture (tests/fixtures/muestra.html) fue recortado del HTML real del
catálogo (semestre 2, 2026) — nunca transcrito a mano, porque un dato pasado
"de memoria" ya nos mordió una vez (SPEC.md sección 8).

Correr con:  python3 -m unittest discover tests -v
"""
from __future__ import annotations

import unittest
from pathlib import Path

from engine.models import Seccion, Sesion, hhmm_to_min, min_to_hhmm
from engine.opciones import agrupar_por_horario, build_opciones_curso
from engine.overlap import sesiones_se_traslapan
from engine.solver import find_all_valid_combinations, variantes_emergencia
from engine.strategies import ESTRATEGIAS, compute_metrics, evaluar, rankear
from scraper.parse import agrupar_cursos, parse_secciones

FIXTURE = Path(__file__).parent / "fixtures" / "muestra.html"


def _cursos_fixture():
    return agrupar_cursos(parse_secciones(FIXTURE.read_text(encoding="utf-8")))


def _seccion(codigo="0000", seccion="A", inicio="07:10", fin="08:50",
             dias=("LU",), categoria=None, restringida=False, catedratico="PROF"):
    """Fábrica para secciones sintéticas en tests de unidad puros."""
    return Seccion(
        curso_codigo=codigo, curso_nombre="CURSO SINTETICO", seccion=seccion,
        categoria=categoria, modalidad="PRESENCIAL",
        inicio_min=hhmm_to_min(inicio), fin_min=hhmm_to_min(fin),
        dias=frozenset(dias), catedratico=catedratico, auxiliar=None,
        restringida=restringida,
    )


class TestParserContraDatosReales(unittest.TestCase):
    """La estructura de la tabla se parsea tal como está publicada."""

    @classmethod
    def setUpClass(cls):
        cls.cursos = _cursos_fixture()

    def test_algoritmos_0768_estructura(self):
        c = self.cursos["0768"]
        self.assertEqual(c.nombre, "INTRODUCCION A LOS ALGORITMOS Y FLUJO DE DATOS")
        self.assertEqual({s.seccion for s in c.secciones_clase}, {"A", "B", "C"})
        self.assertEqual(list(c.componentes_practicos), ["Laboratorio"])
        self.assertEqual({s.seccion for s in c.componentes_practicos["Laboratorio"]},
                         {"A", "B", "C"})

    def test_algoritmos_c_clase_viernes_lab_sabado(self):
        """El caso que motivó el proyecto: clase C VI 07:10–10:40 y su
        laboratorio en SÁBADO 10:30–12:10 — días distintos, cero traslape."""
        c = self.cursos["0768"]
        clase_c = next(s for s in c.secciones_clase if s.seccion == "C")
        lab_c = next(s for s in c.componentes_practicos["Laboratorio"]
                     if s.seccion == "C")
        self.assertEqual((clase_c.dias, min_to_hhmm(clase_c.inicio_min),
                          min_to_hhmm(clase_c.fin_min)),
                         (frozenset({"VI"}), "07:10", "10:40"))
        self.assertEqual((lab_c.dias, min_to_hhmm(lab_c.inicio_min),
                          min_to_hhmm(lab_c.fin_min)),
                         (frozenset({"SA"}), "10:30", "12:10"))
        self.assertFalse(sesiones_se_traslapan(
            [Sesion(clase_c.inicio_min, clase_c.fin_min, clase_c.dias)],
            [Sesion(lab_c.inicio_min, lab_c.fin_min, lab_c.dias)]))

    def test_dias_multiples_en_una_celda(self):
        """'LU MA JU VI' en una sola celda se separa en el set correcto."""
        fisica = self.cursos["0147"]
        sec_a = next(s for s in fisica.secciones_clase if s.seccion == "A")
        self.assertEqual(sec_a.dias, frozenset({"LU", "MA", "JU", "VI"}))

    def test_restringidas_detectadas_no_eliminadas(self):
        """'Ver Restricciones' marca la bandera pero la sección SIGUE en el
        catálogo (la elegibilidad depende del pénsum del usuario)."""
        fisica = self.cursos["0147"]
        c_mas = next(s for s in fisica.secciones_clase if s.seccion == "C+")
        self.assertTrue(c_mas.restringida)
        z = next(s for s in fisica.secciones_clase if s.seccion == "Z")
        self.assertFalse(z.restringida)

    def test_0550_dos_componentes_practicos(self):
        """Vías Terrestres 1 tiene Práctica Y Laboratorio a la vez — el motivo
        de generalizar el modelo más allá de clase+lab."""
        c = self.cursos["0550"]
        self.assertEqual(set(c.componentes_practicos),
                         {"Práctica", "Laboratorio"})
        practicas = c.componentes_practicos["Práctica"]
        self.assertEqual({s.seccion for s in practicas}, {"1+", "1-"})
        self.assertTrue(all(s.restringida for s in practicas))


class TestAgrupacionEquivalentes(unittest.TestCase):

    def test_secciones_p_y_q_de_fisica_son_equivalentes(self):
        """0147 P y Q: mismo horario (LU MA JU VI 14:00–14:50), distinto
        catedrático -> un solo grupo con dos alternativas."""
        fisica = _cursos_fixture()["0147"]
        pq = [s for s in fisica.secciones_clase if s.seccion in ("P", "Q")]
        grupos = agrupar_por_horario(pq)
        self.assertEqual(len(grupos), 1)
        self.assertEqual({s.seccion for s in grupos[0]}, {"P", "Q"})

    def test_horarios_distintos_no_se_agrupan(self):
        """0768 A (MA JU) y B (LU MI) comparten hora pero NO días: son
        opciones distintas, no equivalentes."""
        algo = _cursos_fixture()["0768"]
        grupos = agrupar_por_horario(algo.secciones_clase)
        self.assertEqual(len(grupos), 3)


class TestOpcionesConLaboratorio(unittest.TestCase):

    def test_0768_todas_las_clases_compatibles_con_lab(self):
        """Con el dato real (lab en sábado), las 3 clases de 0768 tienen combo
        válido: 3 horarios de clase x 1 horario de lab = 3 opciones."""
        opciones, advertencias = build_opciones_curso(_cursos_fixture()["0768"])
        self.assertEqual(len(opciones), 3)
        self.assertEqual(advertencias, [])
        for op in opciones:
            self.assertEqual([c.categoria for c in op.componentes],
                             ["Clase", "Laboratorio"])

    def test_clase_incompatible_con_todos_los_labs_avisa(self):
        """Caso sintético de la trampa real: una clase que se traslapa con
        TODAS las secciones de laboratorio debe producir advertencia explícita,
        no fallar en silencio (SPEC.md sección 8)."""
        from engine.models import Curso
        curso = Curso(codigo="9999", nombre="TRAMPA")
        curso.secciones_clase = [
            _seccion("9999", "A", "07:10", "10:40", ("VI",)),
            _seccion("9999", "B", "13:00", "14:40", ("LU",)),
        ]
        curso.componentes_practicos["Laboratorio"] = [
            # Ambos labs chocan con la clase A (viernes por la mañana)
            _seccion("9999", "L1", "10:30", "12:10", ("VI",), "Laboratorio"),
            _seccion("9999", "L2", "08:00", "09:40", ("VI",), "Laboratorio"),
        ]
        opciones, advertencias = build_opciones_curso(curso)
        # La clase B sí es compatible con ambos labs -> 2 opciones
        self.assertEqual(len(opciones), 2)
        self.assertTrue(any("sección A" in a and "TODAS" in a for a in advertencias),
                        f"advertencias: {advertencias}")

    def test_restringidas_excluidas_por_defecto_pero_incluibles(self):
        """0550: la Práctica solo existe en secciones restringidas. Sin marcar
        nada -> 0 opciones + advertencia clara. Marcando '1+' -> hay opciones."""
        curso = _cursos_fixture()["0550"]
        opciones, advertencias = build_opciones_curso(curso)
        self.assertEqual(opciones, [])
        self.assertTrue(any("restringidas" in a.lower() for a in advertencias))

        opciones2, _ = build_opciones_curso(curso, incluir_restringidas={"1+", "N+"})
        self.assertGreater(len(opciones2), 0)


class TestSolverYMetricas(unittest.TestCase):

    def _combo_algoritmos_y_fisica_z(self):
        """Combinación real conocida: 0768 (cualquier sección) + 0147 con solo
        la sección Z (sábado) habilitada como universo."""
        cursos = _cursos_fixture()
        op_algo, _ = build_opciones_curso(cursos["0768"])

        from engine.models import Curso
        fisica_z = Curso(codigo="0147", nombre=cursos["0147"].nombre)
        fisica_z.secciones_clase = [s for s in cursos["0147"].secciones_clase
                                    if s.seccion == "Z"]
        # Física Z se prueba sin sus laboratorios a propósito: aísla el caso
        # "único bloque de un solo día (sábado)" de SPEC.md 2.4.
        op_z, _ = build_opciones_curso(fisica_z)
        return [("0768", op_algo), ("0147", op_z)]

    def test_solver_encuentra_solo_combinaciones_sin_traslape(self):
        """Física Z (SA 07:10–10:30) NO choca con los labs de 0768
        (SA 10:30–12:10): se tocan en el minuto 10:30 pero tocarse no es
        traslaparse. Las 3 opciones de 0768 sobreviven."""
        requisitos = self._combo_algoritmos_y_fisica_z()
        combos = find_all_valid_combinations(requisitos)
        self.assertEqual(len(combos), 3)
        # y el orden interno respeta el orden de los requisitos
        self.assertEqual([codigo for codigo, _ in combos[0]], ["0768", "0147"])

    def test_metricas_sabado_y_dias_libres(self):
        requisitos = self._combo_algoritmos_y_fisica_z()
        combos = find_all_valid_combinations(requisitos)
        # combo con clase C de 0768 (solo viernes) -> LU–JU completamente libres
        combo_c = next(c for c in combos
                       if "VI" in c[0][1].componentes[0].sesion.dias)
        m = compute_metrics(combo_c)
        self.assertTrue(m["usa_sabado"])
        self.assertEqual(m["dias_libres"], {"LU", "MA", "MI", "JU"})
        self.assertEqual(m["num_dias_con_clase"], 1)
        # sin bloqueos "evitar" no hay minutos penalizados
        self.assertEqual(m["minutos_en_evitar"], 0)

    def test_metricas_minutos_en_evitar(self):
        """Un bloqueo 'evitar' VI 07:00–09:00 pisa 110 min de la clase C de
        0768 (VI 07:10–10:40); el resto de combos (MA/JU) no lo pisan."""
        from engine.models import Sesion, hhmm_to_min
        requisitos = self._combo_algoritmos_y_fisica_z()
        combos = find_all_valid_combinations(requisitos)
        evitar = [Sesion(hhmm_to_min("07:00"), hhmm_to_min("09:00"),
                         frozenset({"VI"}))]
        combo_c = next(c for c in combos
                       if "VI" in c[0][1].componentes[0].sesion.dias)
        self.assertEqual(compute_metrics(combo_c, evitar)["minutos_en_evitar"], 110)
        combo_otro = next(c for c in combos
                          if "VI" not in c[0][1].componentes[0].sesion.dias)
        self.assertEqual(compute_metrics(combo_otro, evitar)["minutos_en_evitar"], 0)

    def test_solver_respeta_bloqueos_imposibles(self):
        """Un bloqueo 'imposible' el viernes por la mañana elimina la
        combinación con la clase C (VI 07:10–10:40) y deja las otras dos."""
        from engine.models import Sesion, hhmm_to_min
        requisitos = self._combo_algoritmos_y_fisica_z()
        imposible = [Sesion(hhmm_to_min("07:00"), hhmm_to_min("12:00"),
                            frozenset({"VI"}))]
        combos = find_all_valid_combinations(requisitos, imposible)
        self.assertEqual(len(combos), 2)
        for combo in combos:
            self.assertNotIn("VI", combo[0][1].componentes[0].sesion.dias)

    def test_estrategia_maximo_dia_libre_elige_viernes(self):
        """Con 'máximo día libre', la mejor combinación debe ser la de un solo
        día de semana con clase (0768 C viernes), no las de dos días."""
        requisitos = self._combo_algoritmos_y_fisica_z()
        evaluadas = evaluar(find_all_valid_combinations(requisitos))
        top = rankear(evaluadas, "maximo_dia_libre", top_n=1)
        (combo, metrics) = top[0]
        self.assertEqual(metrics["num_dias_con_clase"], 1)
        self.assertEqual(combo[0][1].componentes[0].sesion.dias, frozenset({"VI"}))

    def test_variantes_emergencia(self):
        """Si la sección elegida de 0768 se llena, las otras 2 caben sin mover
        el resto (Física Z es sábado temprano y no choca con nada de semana)."""
        requisitos = self._combo_algoritmos_y_fisica_z()
        combos = find_all_valid_combinations(requisitos)
        emergencia = variantes_emergencia(combos[0], requisitos)
        self.assertEqual(len(emergencia["0768"]), 2)
        self.assertEqual(len(emergencia["0147"]), 0)  # Z era la única opción

    def test_traslape_parcial_se_detecta(self):
        a = [Sesion(hhmm_to_min("07:10"), hhmm_to_min("08:50"), frozenset({"MA", "JU"}))]
        b = [Sesion(hhmm_to_min("08:00"), hhmm_to_min("09:40"), frozenset({"JU"}))]
        self.assertTrue(sesiones_se_traslapan(a, b))

    def test_tocarse_no_es_traslape(self):
        a = [Sesion(hhmm_to_min("07:10"), hhmm_to_min("10:30"), frozenset({"SA"}))]
        b = [Sesion(hhmm_to_min("10:30"), hhmm_to_min("12:10"), frozenset({"SA"}))]
        self.assertFalse(sesiones_se_traslapan(a, b))

    def test_todas_las_estrategias_rankean_sin_error(self):
        requisitos = self._combo_algoritmos_y_fisica_z()
        evaluadas = evaluar(find_all_valid_combinations(requisitos))
        for estrategia_id in ESTRATEGIAS:
            top = rankear(evaluadas, estrategia_id, top_n=3)
            self.assertGreater(len(top), 0)


if __name__ == "__main__":
    unittest.main()
