"""Tests del parser de la red de estudios (pénsum) de Ciencias y Sistemas.

El fixture es un recorte del HTML real de redesestudio.ingenieria.usac.edu.gt
(pénsum 28) — mismos criterios que test_cases_reales: nunca transcribir a mano.
"""
from __future__ import annotations

import unittest
from pathlib import Path

from scraper.pensum import cursos_elegibles, parse_pensum

FIXTURE = Path(__file__).parent / "fixtures" / "pensum_muestra.html"


class TestParserPensum(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.pensum = parse_pensum(FIXTURE.read_text(encoding="utf-8"))
        cls.por_codigo = {c["codigo"]: c for c in cls.pensum}

    def test_estructura_general(self):
        """75 cursos repartidos en 10 semestres, todos con nombre y créditos."""
        self.assertEqual(len(self.pensum), 75)
        self.assertEqual({c["semestre"] for c in self.pensum}, set(range(1, 11)))
        self.assertTrue(all(c["nombre"] for c in self.pensum))
        self.assertTrue(all(c["creditos"] is not None for c in self.pensum))

    def test_algoritmos_0768(self):
        """0768 está en 2do semestre, 4 créditos, prerrequisito 0101
        (Área Matemática Básica 1) — verificado contra la página real."""
        c = self.por_codigo["0768"]
        self.assertEqual(c["semestre"], 2)
        self.assertEqual(c["creditos"], 4)
        self.assertEqual(c["prerrequisitos"], ["0101"])
        self.assertEqual(c["nombre"], "Introducción a los Algoritmos y Flujo de Datos")

    def test_prerrequisitos_multiples(self):
        """0770 (Intro a la Programación 1) exige 4 cursos previos."""
        c = self.por_codigo["0770"]
        self.assertEqual(set(c["prerrequisitos"]), {"0768", "0103", "0147", "0960"})

    def test_curso_sin_prerrequisitos(self):
        self.assertEqual(self.por_codigo["0005"]["prerrequisitos"], [])

    def test_elegibles_estudiante_nuevo(self):
        """Sin nada aprobado, solo se puede llevar el 1er semestre completo."""
        elegibles = {c["codigo"] for c in cursos_elegibles(self.pensum, set())}
        self.assertEqual(elegibles, {"0005", "0006", "0017", "0039", "0101"})

    def test_elegibles_con_avance(self):
        """Aprobando 1er semestre + 0103/0147/0960/0768, se destraba 0770 pero
        NO 0771 (que además pide 0770)."""
        aprobados = {"0005", "0006", "0017", "0039", "0101",
                     "0103", "0147", "0960", "0768"}
        elegibles = {c["codigo"] for c in cursos_elegibles(self.pensum, aprobados)}
        self.assertIn("0770", elegibles)
        self.assertNotIn("0771", elegibles)
        # lo ya aprobado nunca aparece como elegible
        self.assertFalse(elegibles & aprobados)


if __name__ == "__main__":
    unittest.main()
