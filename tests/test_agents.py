"""
Testes unitários dos agentes (seção 16 do prompt-mestre).
Usa unittest da stdlib — sem dependência de pytest, já que o registro de
pacotes não estava acessível nesta sessão de execução.

Rodar: python3 -m unittest discover -s tests -v
"""

import sys
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "packages" / "agents"))

from score import ScoreInput, compute_score  # noqa: E402
from compliance import (  # noqa: E402
    check_business_hours,
    check_blocklist,
    check_daily_campaign_limit,
    check_duplicate,
    check_has_source,
    check_opt_out,
    check_sensitive_data,
    should_continue_cadence,
)
from copywriter import generate_message, lint_message  # noqa: E402

TZ = ZoneInfo("America/Sao_Paulo")


class TestScore(unittest.TestCase):
    def test_strong_lead_scores_high_and_class_a(self):
        data = ScoreInput(
            has_physical_product=True,
            catalog_size=120,
            has_own_brand_or_manufacturer=True,
            years_active=8,
            has_website=True,
            has_active_instagram=True,
            marketplace_presence={"mercado_livre": False, "amazon": False, "shopee": False},
            marketplace_listing_quality="ausente",
            price_alignment="desconhecido",
            public_contact_available=True,
            decision_maker_identified=True,
            investment_capacity_signal="alto",
            problem_clarity_signal="alto",
        )
        result = compute_score(data)
        self.assertGreaterEqual(result.total, 80)
        self.assertEqual(result.potential, "A")
        self.assertEqual(result.confidence, "alto")

    def test_weak_lead_scores_low_and_not_approached(self):
        data = ScoreInput(has_physical_product=False)
        result = compute_score(data)
        self.assertLess(result.total, 50)
        self.assertEqual(result.potential, "NAO_ABORDAR")

    def test_missing_signals_reduce_confidence(self):
        data = ScoreInput(has_physical_product=True, catalog_size=100)
        result = compute_score(data)
        self.assertEqual(result.confidence, "baixo")

    def test_score_never_exceeds_component_ceilings(self):
        data = ScoreInput(
            has_physical_product=True,
            catalog_size=200,
            has_own_brand_or_manufacturer=True,
            years_active=10,
            has_website=True,
            has_active_instagram=True,
            marketplace_presence={"mercado_livre": False, "amazon": False, "shopee": False},
            marketplace_listing_quality="ausente",
            price_alignment="desalinhado",
            public_contact_available=True,
            decision_maker_identified=True,
            investment_capacity_signal="alto",
            problem_clarity_signal="alto",
        )
        result = compute_score(data)
        self.assertLessEqual(result.product_fit, 20)
        self.assertLessEqual(result.marketplace_gap, 20)
        self.assertLessEqual(result.business_structure, 15)
        self.assertLessEqual(result.catalog_quality, 15)
        self.assertLessEqual(result.investment_signals, 10)
        self.assertLessEqual(result.contactability, 10)
        self.assertLessEqual(result.problem_clarity, 10)
        self.assertLessEqual(result.total, 100)


class TestCompliance(unittest.TestCase):
    def test_business_hours_weekday_ok(self):
        dt = datetime(2026, 8, 5, 10, 0, tzinfo=TZ)  # quarta-feira
        self.assertTrue(check_business_hours(dt).allowed)

    def test_business_hours_weekend_blocked(self):
        dt = datetime(2026, 8, 8, 10, 0, tzinfo=TZ)  # sábado
        self.assertFalse(check_business_hours(dt).allowed)

    def test_business_hours_night_blocked(self):
        dt = datetime(2026, 8, 5, 22, 0, tzinfo=TZ)
        self.assertFalse(check_business_hours(dt).allowed)

    def test_opt_out_blocks_contact(self):
        result = check_opt_out("contato@empresa.com.br", ["contato@empresa.com.br"])
        self.assertFalse(result.allowed)

    def test_opt_out_allows_new_contact(self):
        result = check_opt_out("novo@empresa.com.br", ["outro@empresa.com.br"])
        self.assertTrue(result.allowed)

    def test_blocklist_blocks_known_value(self):
        result = check_blocklist("11.222.333/0001-44", ["11222333000144"])
        self.assertFalse(result.allowed)

    def test_duplicate_cnpj_blocked(self):
        result = check_duplicate("11.222.333/0001-44", ["11222333000144"])
        self.assertFalse(result.allowed)

    def test_no_source_blocked(self):
        self.assertFalse(check_has_source(0).allowed)
        self.assertTrue(check_has_source(1).allowed)

    def test_sensitive_data_detects_cpf(self):
        self.assertFalse(check_sensitive_data("O CPF do sócio é 123.456.789-00").allowed)

    def test_sensitive_data_allows_normal_text(self):
        self.assertTrue(check_sensitive_data("Empresa vende utilidades domésticas em SP").allowed)

    def test_daily_limit_blocks_when_reached(self):
        self.assertFalse(check_daily_campaign_limit(10, 10).allowed)
        self.assertTrue(check_daily_campaign_limit(9, 10).allowed)

    def test_cadence_stops_after_reply(self):
        self.assertFalse(should_continue_cadence("interessado").allowed)
        self.assertTrue(should_continue_cadence(None).allowed)


class TestCopywriter(unittest.TestCase):
    def test_generate_contato_inicial(self):
        text = generate_message(
            "contato_inicial",
            {
                "nome": "Marina",
                "empresa": "Casa Bela Utilidades",
                "canal_ou_categoria": "cama, mesa e banho",
                "fato_objetivo": "vocês não têm nenhum anúncio ativo no Mercado Livre",
            },
        )
        self.assertIn("Casa Bela Utilidades", text)
        self.assertTrue(lint_message(text).ok)

    def test_lint_rejects_forbidden_phrase(self):
        result = lint_message("Somos uma agência especializada, parabéns pelo excelente trabalho!")
        self.assertFalse(result.ok)
        self.assertTrue(any("agência" in p for p in result.problems))

    def test_lint_rejects_unfilled_template(self):
        result = lint_message("Olá {nome}, tudo bem?")
        self.assertFalse(result.ok)

    def test_lint_rejects_generic_message(self):
        result = lint_message("olá tudo bem, vi seu perfil e achei interessante, podemos conversar?")
        self.assertFalse(result.ok)

    def test_generate_missing_field_raises(self):
        with self.assertRaises(ValueError):
            generate_message("contato_inicial", {"nome": "Marina"})


if __name__ == "__main__":
    unittest.main()
