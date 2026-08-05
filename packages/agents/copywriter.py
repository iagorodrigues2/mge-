"""
Agente Copywriter — seção 6.4, 8 e 9 do prompt-mestre.

Gera mensagens a partir dos templates oficiais de cadência, exigindo que cada
mensagem carregue um fato real e uma oportunidade específica encontrada na
auditoria — nunca elogio genérico ou promessa de resultado.

`lint_message` funciona como o guardrail de compliance de conteúdo: barra
frases proibidas antes que a mensagem chegue à fila de aprovação humana.
"""

from dataclasses import dataclass
from typing import Optional

TEMPLATES = {
    "contato_inicial": (
        "Olá, {nome}. Analisei rapidamente a presença digital da {empresa} e "
        "encontrei uma oportunidade específica em {canal_ou_categoria}. Vocês "
        "têm um catálogo com boa aderência a marketplace, mas hoje {fato_objetivo}. "
        "Eu atuo na implantação e escala de Mercado Livre, Amazon e Shopee, "
        "olhando margem, estoque, logística e operação. Posso te enviar um "
        "diagnóstico bem curto com os três pontos que identifiquei?"
    ),
    "followup_1": (
        "{nome}, complementando a mensagem anterior: o principal ponto que "
        "identifiquei foi {oportunidade_real}. Não estou falando de simplesmente "
        "cadastrar produtos, mas de estruturar o canal para não perder margem e "
        "não criar um problema operacional. Faz sentido eu te mandar o diagnóstico?"
    ),
    "followup_2": (
        "Preparei um resumo da {empresa} com três pontos: {ponto_1}, {ponto_2} e "
        "{ponto_3}. Caso marketplace esteja entre as prioridades deste semestre, "
        "consigo te explicar em uma conversa objetiva como eu estruturaria isso."
    ),
    "encerramento": (
        "{nome}, vou encerrar meu contato para não ser inconveniente. Caso a "
        "expansão em Mercado Livre, Amazon ou Shopee entre no planejamento da "
        "{empresa}, fico à disposição para compartilhar o diagnóstico que preparei."
    ),
}

# seção 6.4: frases proibidas — indicam elogio genérico, discurso de agência,
# promessa de resultado ou pressão/urgência artificial.
_FORBIDDEN_PHRASES = [
    "somos uma agência",
    "quero apresentar meus serviços",
    "parabéns pelo excelente trabalho",
    "empresa incrível",
    "vamos multiplicar seu faturamento",
    "garanto que vai vender mais",
    "essa é uma oportunidade única",
    "só até hoje",
    "últimas vagas",
    "não perca essa chance",
]

MAX_MESSAGE_CHARS = 700


@dataclass
class LintResult:
    ok: bool
    problems: list[str]


def generate_message(step: str, fields: dict[str, str]) -> str:
    if step not in TEMPLATES:
        raise ValueError(f"etapa de cadência desconhecida: {step}")
    template = TEMPLATES[step]
    try:
        return template.format(**fields)
    except KeyError as exc:
        raise ValueError(f"campo obrigatório ausente para a etapa '{step}': {exc}") from exc


def lint_message(text: str, *, requires_named_fact: bool = True) -> LintResult:
    problems: list[str] = []
    lowered = text.lower()

    for phrase in _FORBIDDEN_PHRASES:
        if phrase in lowered:
            problems.append(f"contém frase proibida: '{phrase}'")

    if len(text) > MAX_MESSAGE_CHARS:
        problems.append(f"mensagem longa demais ({len(text)} caracteres, máx {MAX_MESSAGE_CHARS})")

    if "{" in text or "}" in text:
        problems.append("template com placeholder não preenchido")

    if requires_named_fact and not _looks_specific(text):
        problems.append("mensagem parece genérica: não identifiquei um fato/nome específico da empresa")

    return LintResult(ok=not problems, problems=problems)


def _looks_specific(text: str) -> bool:
    # heurística simples: mensagem específica tende a ter ao menos uma
    # palavra capitalizada fora do início da frase (nome próprio/empresa)
    words = text.replace(".", " ").replace(",", " ").split()
    for i, w in enumerate(words):
        if i == 0:
            continue
        if w[:1].isupper() and w.lower() not in {"mercado", "livre", "amazon", "shopee", "eu"}:
            return True
    return False
