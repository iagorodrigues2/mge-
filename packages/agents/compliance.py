"""
Agente de Compliance — seção 6.7 / 14 do prompt-mestre.

Bloqueia, antes que uma ação chegue a um humano para aprovação:
  - contato já recusado (opt-out);
  - duplicidade;
  - mensagem fora do horário comercial;
  - contato sem fonte;
  - uso de dado sensível (LGPD, art. 5º, II);
  - envio automático inicial por WhatsApp sem permissão (aplicado na camada
    de UI: o botão "enviar" nunca é acionado pelo sistema, sempre pelo
    humano — ver docs/implantacao-whatsapp.md);
  - limite diário de campanha excedido.

Nenhuma função aqui envia nada. Elas só retornam allow/deny + motivo, para a
camada de aplicação decidir o que fazer (normalmente: não oferecer o botão de
ação, ou marcar a ação como bloqueada no painel de Compliance).
"""

import re
from dataclasses import dataclass
from datetime import datetime, time
from typing import Optional
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Sao_Paulo")

BUSINESS_HOURS_START = time(8, 0)
BUSINESS_HOURS_END = time(19, 0)
BUSINESS_DAYS = {0, 1, 2, 3, 4}  # segunda a sexta (0=segunda no isoweekday-1)

# Padrões simples de dado sensível (LGPD art. 5º, II): CPF, saúde, religião,
# orientação política/sindical, orientação sexual, dado genético/biométrico.
# É um filtro best-effort, não substitui revisão jurídica.
_CPF_PATTERN = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
_SENSITIVE_KEYWORDS = [
    "cpf", "rg ", "religi", "católic", "evang", "espírita", "candomblé",
    "partido político", "filiação sindical", "orientação sexual",
    "estado de saúde", "diagnóstico médico", "dado genético", "biométric",
]


@dataclass
class ComplianceCheck:
    allowed: bool
    reason: str


def check_business_hours(now: Optional[datetime] = None) -> ComplianceCheck:
    now = (now or datetime.now(TZ)).astimezone(TZ)
    weekday = now.weekday()  # 0=segunda
    if weekday not in BUSINESS_DAYS:
        return ComplianceCheck(False, "fora do horário comercial: fim de semana")
    if not (BUSINESS_HOURS_START <= now.time() <= BUSINESS_HOURS_END):
        return ComplianceCheck(False, f"fora do horário comercial ({BUSINESS_HOURS_START}–{BUSINESS_HOURS_END})")
    return ComplianceCheck(True, "dentro do horário comercial")


def check_opt_out(contact_value: str, opt_outs: list[str]) -> ComplianceCheck:
    normalized = _normalize(contact_value)
    for opted in opt_outs:
        if _normalize(opted) == normalized:
            return ComplianceCheck(False, "contato pediu opt-out anteriormente")
    return ComplianceCheck(True, "sem opt-out registrado")


def check_blocklist(value: str, blocklist_values: list[str]) -> ComplianceCheck:
    normalized = _normalize(value)
    for blocked in blocklist_values:
        if _normalize(blocked) == normalized:
            return ComplianceCheck(False, "valor está na blocklist")
    return ComplianceCheck(True, "não está na blocklist")


def check_duplicate(cnpj: Optional[str], existing_cnpjs: list[str]) -> ComplianceCheck:
    if not cnpj:
        return ComplianceCheck(True, "sem CNPJ para checar duplicidade")
    normalized = _normalize(cnpj)
    if normalized in {_normalize(c) for c in existing_cnpjs if c}:
        return ComplianceCheck(False, "empresa já cadastrada (CNPJ duplicado)")
    return ComplianceCheck(True, "sem duplicidade")


def check_has_source(source_count: int) -> ComplianceCheck:
    if source_count <= 0:
        return ComplianceCheck(False, "nenhuma fonte registrada para o dado coletado")
    return ComplianceCheck(True, "fonte registrada")


def check_sensitive_data(text: str) -> ComplianceCheck:
    if _CPF_PATTERN.search(text):
        return ComplianceCheck(False, "texto contém padrão semelhante a CPF (dado pessoal sensível/identificável)")
    lowered = text.lower()
    for kw in _SENSITIVE_KEYWORDS:
        if kw in lowered:
            return ComplianceCheck(False, f"texto menciona categoria de dado sensível ('{kw.strip()}')")
    return ComplianceCheck(True, "nenhum dado sensível detectado (checagem best-effort)")


def check_daily_campaign_limit(used_today: int, daily_limit: int) -> ComplianceCheck:
    if used_today >= daily_limit:
        return ComplianceCheck(False, f"limite diário da campanha atingido ({used_today}/{daily_limit})")
    return ComplianceCheck(True, f"dentro do limite diário ({used_today}/{daily_limit})")


def should_continue_cadence(last_reply_classification: Optional[str]) -> ComplianceCheck:
    """Interrompe a cadência assim que houver qualquer resposta do lead."""
    if last_reply_classification:
        return ComplianceCheck(False, f"cadência interrompida: lead já respondeu ('{last_reply_classification}')")
    return ComplianceCheck(True, "sem resposta ainda, cadência pode continuar")


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())
