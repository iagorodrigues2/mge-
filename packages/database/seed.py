#!/usr/bin/env python3
"""
Seed fictício — seção 16: "Criar dados fictícios. Nunca usar dados reais nos
testes." Todas as empresas, CNPJs, contatos e valores abaixo são inventados
para demonstrar o sistema ponta a ponta (pesquisa -> score -> aprovação ->
contato assistido -> resposta -> agenda -> call -> proposta -> contrato ->
entrada recebida -> onboarding).

Uso: python3 packages/database/seed.py
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages" / "database"))
sys.path.insert(0, str(ROOT / "packages" / "agents"))

from db import quote, execute_file  # noqa: E402
from score import ScoreInput, compute_score  # noqa: E402

TZ = ZoneInfo("America/Sao_Paulo")
NOW = datetime.now(TZ)
TODAY = NOW.date()

stmts: list[str] = ["BEGIN;", "TRUNCATE TABLE " + ", ".join([
    "revenue_events", "payment_proofs", "installments", "payments", "contracts",
    "proposal_versions", "proposals", "stage_history", "activities", "deals",
    "call_notes", "calls", "meetings", "calendar_events", "qualifications",
    "tasks", "follow_up_rules", "reply_classifications", "conversations",
    "outreach_attempts", "outreach_messages", "lead_approvals", "lead_scores",
    "audit_findings", "marketplace_presences", "sources", "contacts",
    "campaign_budgets", "campaigns", "companies", "discount_policies",
    "price_versions", "service_packages", "pipeline_stages", "opt_outs",
    "blocklist", "audit_logs", "notifications", "saved_views",
    "onboarding_projects", "data_exports", "integration_credentials",
    "webhook_events", "daily_agendas", "segments", "users",
]) + " RESTART IDENTITY CASCADE;"]


RESERVED_COLUMNS = {"order"}


def _col(name: str) -> str:
    return f'"{name}"' if name in RESERVED_COLUMNS else name


def ins(table: str, id_: int, **fields) -> None:
    cols = ["id"] + [_col(k) for k in fields.keys()]
    vals = [str(id_)] + [quote(v) for v in fields.values()]
    stmts.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(vals)});")


# ---------------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------------
ins("users", 1, name="Iago Rodrigues", email="comercial.rodriguesimport@gmail.com", role="ADMIN", active=True)
ins("users", 2, name="Assistente SDR (fictício)", email="sdr@exemplo-mge.com.br", role="SDR", active=True)

# ---------------------------------------------------------------------------
# Segmentos (ordem da seção 4.1)
# ---------------------------------------------------------------------------
SEGMENTS = [
    (1, "Casa, móveis, decoração, utilidades e cama/mesa/banho"),
    (2, "Moda, vestuário, calçados e acessórios"),
    (3, "Esporte, fitness e lazer"),
    (4, "Beleza, cuidados pessoais e acessórios"),
    (5, "Pet"),
    (6, "Ferramentas e utilidades profissionais"),
    (7, "Acessórios automotivos"),
]
for sid, name in SEGMENTS:
    ins("segments", sid, name=name, order=sid, active=True)

# ---------------------------------------------------------------------------
# Ofertas e preços (seção 3 — versionado, nunca hard-coded no código)
# ---------------------------------------------------------------------------
ins("service_packages", 1, code="diagnostico", name="Diagnóstico Executivo Marketplace",
    description="Diagnóstico pago de catálogo, canais, margem aparente, concorrência e prioridades.", active=True)
ins("service_packages", 2, code="mentoria_90", name="Mentoria Marketplace 90",
    description="Plano de 90 dias, encontros estratégicos e acompanhamento para empresa com equipe própria de execução.", active=True)
ins("service_packages", 3, code="implantacao_90", name="Implantação Marketplace 90",
    description="Oferta principal: diagnóstico, catálogo, precificação, estrutura tributária/logística, implantação de anúncios e treinamento.", active=True)
ins("service_packages", 4, code="programa_anual", name="Programa Anual de Escala",
    description="Fase intensiva inicial + acompanhamento executivo ao longo de 12 meses.", active=True)

ins("price_versions", 1, package_id=1, price_cents=250000, duration_days=None, note="Preço de referência; pode ser abatido da Implantação 90 em até 15 dias.")
ins("price_versions", 2, package_id=2, price_cents=900000, duration_days=90, note="Preço oficial de referência.")
ins("price_versions", 3, package_id=3, price_cents=2000000, duration_days=90, note="Oferta principal. Preço oficial de referência.")
ins("price_versions", 4, package_id=4, price_cents=4000000, duration_days=365, note="Preço oficial de tabela.")
ins("price_versions", 5, package_id=4, price_cents=3000000, duration_days=365, note="Condição Cliente Fundador — máx. 3 clientes, não renovável automaticamente.",
    is_founder_offer=True, max_founder_slots=3)

ins("discount_policies", 1, name="Pagamento à vista", max_percent=10, requires_approval=True, active=True)
ins("discount_policies", 2, name="Desconto comercial padrão", max_percent=5, requires_approval=True, active=True)

# ---------------------------------------------------------------------------
# Estágios do Kanban (seção 12D — 23 estágios)
# ---------------------------------------------------------------------------
STAGES = [
    (1, "encontrado", "Encontrado"), (2, "em_auditoria", "Em auditoria"),
    (3, "qualificado", "Qualificado"), (4, "aguardando_aprovacao", "Aguardando aprovação"),
    (5, "aprovado_contato", "Aprovado para contato"), (6, "contatado", "Contatado"),
    (7, "follow_up", "Follow-up"), (8, "respondeu", "Respondeu"),
    (9, "qualificacao", "Qualificação"), (10, "reuniao_marcada", "Reunião marcada"),
    (11, "reuniao_realizada", "Reunião realizada"), (12, "proposta_elaboracao", "Proposta em elaboração"),
    (13, "proposta_enviada", "Proposta enviada"), (14, "negociacao", "Negociação"),
    (15, "contrato_enviado", "Contrato enviado"), (16, "contrato_assinado", "Contrato assinado"),
    (17, "aguardando_pagamento", "Aguardando pagamento"), (18, "entrada_recebida", "Entrada recebida"),
    (19, "ganho_recebido", "Ganho e recebido"), (20, "onboarding", "Onboarding"),
    (21, "nutricao", "Nutrição"), (22, "perdido", "Perdido"), (23, "bloqueado", "Bloqueado"),
]
for sid, code, name in STAGES:
    ins("pipeline_stages", sid, code=code, name=name, order=sid)

ins("follow_up_rules", 1, step="followup_1", days_after_previous=3, channel="whatsapp", active=True)
ins("follow_up_rules", 2, step="followup_2", days_after_previous=4, channel="email", active=True)
ins("follow_up_rules", 3, step="encerramento", days_after_previous=5, channel="whatsapp", active=True)

# ---------------------------------------------------------------------------
# Campanha piloto
# ---------------------------------------------------------------------------
ins(
    "campaigns", 1,
    name="Casa & Decoração — Piloto SP/PR",
    segment_id=1, owner_id=1, region="SP/PR",
    cnaes=["4754-7/01", "4759-8/99", "4713-0/02"],
    keywords=["utilidades domésticas", "cama mesa banho", "decoração"],
    exclusions=["dropshipping puro", "sem estoque próprio"],
    offer_id=3, max_companies=100, daily_search_limit=20, daily_outreach_limit=10,
    start_date=(TODAY - timedelta(days=12)).isoformat(), status="RUNNING",
)
ins("campaign_budgets", 1, campaign_id=1, date=TODAY.isoformat(), searches_used=14, outreach_used=6)

# ---------------------------------------------------------------------------
# Empresas fictícias — cobrindo todos os estágios do funil
# ---------------------------------------------------------------------------
# (nome fantasia, razão social, cidade, uf, segmento, status, config extra)
COMPANIES = [
    dict(id=1, trade="Casa Bela Utilidades", legal="Casa Bela Comércio de Utilidades Domésticas Ltda",
         city="Campinas", state="SP", segment=1, status="FOUND"),
    dict(id=2, trade="Lar Doce Lar Decor", legal="Lar Doce Lar Decorações Ltda",
         city="Curitiba", state="PR", segment=1, status="FOUND"),
    dict(id=3, trade="Mesa Posta Enxovais", legal="Mesa Posta Têxtil Lar Ltda",
         city="Londrina", state="PR", segment=1, status="FOUND"),
    dict(id=4, trade="Aconchego Casa & Cia", legal="Aconchego Comércio de Utilidades Ltda",
         city="Ribeirão Preto", state="SP", segment=1, status="FOUND"),
    dict(id=5, trade="Trama Enxovais", legal="Trama Indústria Têxtil Ltda",
         city="Americana", state="SP", segment=1, status="IN_AUDIT"),
    dict(id=6, trade="Vidraço Utilidades", legal="Vidraço Comércio de Vidros e Utilidades Ltda",
         city="São Carlos", state="SP", segment=1, status="IN_AUDIT"),
    dict(id=7, trade="Panela de Ferro Cozinha", legal="Panela de Ferro Utensílios Ltda",
         city="Maringá", state="PR", segment=1, status="IN_AUDIT"),
    dict(id=8, trade="Fio & Trama Cama e Banho", legal="Fio & Trama Confecções Ltda",
         city="Sorocaba", state="SP", segment=1, status="QUALIFIED"),
    dict(id=9, trade="Doce Moradia Decor", legal="Doce Moradia Comércio Ltda",
         city="Piracicaba", state="SP", segment=1, status="QUALIFIED"),
    dict(id=10, trade="Cantinho Aconchegante", legal="Cantinho Aconchegante Móveis Ltda",
         city="Bauru", state="SP", segment=1, status="QUALIFIED"),
    dict(id=11, trade="Enxoval Real", legal="Enxoval Real Têxtil Ltda",
         city="Cascavel", state="PR", segment=1, status="PENDING_APPROVAL"),
    dict(id=12, trade="Ninho Utilidades", legal="Ninho Comércio de Utilidades Domésticas Ltda",
         city="Jundiaí", state="SP", segment=1, status="PENDING_APPROVAL"),
    dict(id=13, trade="Chão de Casa Móveis", legal="Chão de Casa Móveis e Decorações Ltda",
         city="Santo André", state="SP", segment=1, status="APPROVED"),
    dict(id=14, trade="Aroma Lar Difusores", legal="Aroma Lar Indústria e Comércio Ltda",
         city="Osasco", state="SP", segment=1, status="APPROVED"),
    dict(id=15, trade="Boa Mesa Utensílios", legal="Boa Mesa Utensílios de Cozinha Ltda",
         city="Guarulhos", state="SP", segment=1, status="CONTACTED"),
    dict(id=16, trade="Textura Casa", legal="Textura Casa Têxtil Lar Ltda",
         city="São José dos Campos", state="SP", segment=1, status="CONTACTED"),
    dict(id=17, trade="Varanda Verde Jardinagem", legal="Varanda Verde Utilidades para Jardim Ltda",
         city="Niterói", state="RJ", segment=1, status="FOLLOW_UP"),
    dict(id=18, trade="Alma de Casa Decor", legal="Alma de Casa Comércio de Decoração Ltda",
         city="Belo Horizonte", state="MG", segment=1, status="REPLIED"),
    dict(id=19, trade="Ponto Certo Enxovais", legal="Ponto Certo Têxtil Ltda",
         city="Uberlândia", state="MG", segment=1, status="MEETING_SCHEDULED"),
    dict(id=20, trade="Raiz Móveis Planejados", legal="Raiz Indústria de Móveis Ltda",
         city="Caxias do Sul", state="RS", segment=1, status="PROPOSAL_SENT"),
    dict(id=21, trade="Bambu Casa Sustentável", legal="Bambu Casa Produtos Sustentáveis Ltda",
         city="Florianópolis", state="SC", segment=1, status="CONTRACT_SIGNED"),
    dict(id=22, trade="Giton Mochilas & Cia", legal="Giton Indústria de Mochilas e Acessórios Ltda",
         city="Franca", state="SP", segment=1, status="WON_AND_PAID"),
    dict(id=23, trade="Retiro dos Sonhos Decor", legal="Retiro dos Sonhos Comércio Ltda",
         city="Goiânia", state="GO", segment=1, status="NURTURE"),
    dict(id=24, trade="Estilo Único Utilidades", legal="Estilo Único Comércio de Utilidades Ltda",
         city="Recife", state="PE", segment=1, status="LOST"),
    dict(id=25, trade="Depósito Rápido Cama e Mesa", legal="Depósito Rápido Comércio Ltda",
         city="Fortaleza", state="CE", segment=1, status="BLOCKED"),
]

FAKE_CNPJ_BASE = 11222333000100


def fake_cnpj(i: int) -> str:
    n = FAKE_CNPJ_BASE + i * 137
    s = str(n).zfill(14)
    return f"{s[0:2]}.{s[2:5]}.{s[5:8]}/{s[8:12]}-{s[12:14]}"


for c in COMPANIES:
    ins(
        "companies", c["id"],
        legal_name=c["legal"], trade_name=c["trade"], cnpj=fake_cnpj(c["id"]),
        cnae_primary="4754-7/01", city=c["city"], state=c["state"],
        website=f"https://www.{c['trade'].lower().replace(' ', '').replace('&', 'e')}.com.br",
        instagram=f"@{c['trade'].lower().replace(' ', '.').replace('&', 'e')}",
        public_business_email=f"contato@{c['trade'].lower().replace(' ', '').replace('&', 'e')}.com.br",
        public_business_phone="(19) 3000-00" + str(10 + c["id"]),
        catalog_summary="Catálogo de utilidades domésticas e itens de decoração para casa (dado fictício de demonstração).",
        estimated_sku_range_min=40, estimated_sku_range_max=260,
        segment_id=c["segment"], campaign_id=1, status=c["status"],
        blocked=(c["status"] == "BLOCKED"),
        blocked_reason=("Reputação pública crítica identificada durante auditoria (fictício)." if c["status"] == "BLOCKED" else None),
        created_at=(NOW - timedelta(days=25 - c["id"])).isoformat(),
        last_validated_at=(NOW - timedelta(days=1)).isoformat(),
    )
    ins("sources", c["id"], company_id=c["id"], type="fornecido_pelo_usuario",
        url=None, note="Empresa fictícia de demonstração cadastrada manualmente para validar o fluxo ponta a ponta.",
        collected_at=(NOW - timedelta(days=25 - c["id"])).isoformat())
    ins("contacts", c["id"], company_id=c["id"], name="Decisor(a) " + c["trade"].split()[0],
        role="Sócio(a)-diretor(a)", email=f"decisor@{c['trade'].lower().replace(' ', '').replace('&', 'e')}.com.br",
        phone="(19) 99" + str(1000 + c["id"] * 3), whatsapp="(19) 99" + str(1000 + c["id"] * 3),
        source_note="Publicado no site institucional (fictício)", confidence="médio",
        has_business_context=True)

# Auditoria de marketplace (a partir de IN_AUDIT em diante)
audited_statuses = {"IN_AUDIT", "QUALIFIED", "PENDING_APPROVAL", "APPROVED", "CONTACTED", "FOLLOW_UP",
                     "REPLIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "CONTRACT_SIGNED", "WON_AND_PAID", "NURTURE", "LOST"}
mp_id = 1
af_id = 1
for c in COMPANIES:
    if c["status"] not in audited_statuses:
        continue
    for channel, present in [("MERCADO_LIVRE", False), ("AMAZON", False), ("SHOPEE", c["id"] % 3 == 0)]:
        ins("marketplace_presences", mp_id, company_id=c["id"], channel=channel, present=present,
            listings_count=(3 if present else 0),
            reputation_note=("poucas avaliações" if present else None),
            price_alignment=("desconhecido" if not present else "alinhado"),
            evidence_url=f"https://www.mercadolivre.com.br/busca?q={c['trade'].replace(' ', '+')}",
            confidence="médio", checked_at=(NOW - timedelta(days=3)).isoformat())
        mp_id += 1
    ins("audit_findings", af_id, company_id=c["id"], category="ausencia_canal",
        summary=f"{c['trade']} não possui anúncios ativos no Mercado Livre nem na Amazon; catálogo com aderência a marketplace.",
        evidence_url=c.get("website"), confidence="médio", source="Busca manual assistida",
        created_at=(NOW - timedelta(days=3)).isoformat())
    af_id += 1

# Lead score via o motor real (packages/agents/score.py)
ls_id = 1
company_scores = {}
for c in COMPANIES:
    if c["status"] not in audited_statuses:
        continue
    signal = ScoreInput(
        has_physical_product=True,
        catalog_size=40 + (c["id"] * 7) % 460,
        has_own_brand_or_manufacturer=(c["id"] % 2 == 0),
        years_active=3 + (c["id"] % 12),
        has_website=True,
        has_active_instagram=(c["id"] % 3 != 0),
        marketplace_presence={"mercado_livre": False, "amazon": False, "shopee": c["id"] % 3 == 0},
        marketplace_listing_quality="ausente" if c["id"] % 3 != 0 else "fraca",
        price_alignment="desconhecido",
        public_contact_available=True,
        decision_maker_identified=(c["id"] % 4 != 0),
        investment_capacity_signal=["alto", "medio", "baixo"][c["id"] % 3],
        problem_clarity_signal=["alto", "medio", "baixo"][(c["id"] + 1) % 3],
    )
    result = compute_score(signal)
    company_scores[c["id"]] = result
    suggested = 3 if result.potential == "A" else (2 if result.potential == "B" else 1)
    ins("lead_scores", ls_id, company_id=c["id"], product_fit=result.product_fit,
        marketplace_gap=result.marketplace_gap, business_structure=result.business_structure,
        catalog_quality=result.catalog_quality, investment_signals=result.investment_signals,
        contactability=result.contactability, problem_clarity=result.problem_clarity,
        total=result.total, potential=result.potential, suggested_offer_id=suggested,
        rationale=result.rationale, confidence=result.confidence,
        generated_at=(NOW - timedelta(days=2)).isoformat())
    ls_id += 1

# Aprovações humanas (a partir de APPROVED em diante)
approved_statuses = {"APPROVED", "CONTACTED", "FOLLOW_UP", "REPLIED", "MEETING_SCHEDULED",
                     "PROPOSAL_SENT", "CONTRACT_SIGNED", "WON_AND_PAID"}
la_id = 1
for c in COMPANIES:
    if c["status"] in approved_statuses:
        ins("lead_approvals", la_id, company_id=c["id"], user_id=1, decision="aprovar",
            note="Aprovado após revisão do mini-diagnóstico.", created_at=(NOW - timedelta(days=2)).isoformat())
        la_id += 1
    elif c["status"] == "BLOCKED":
        ins("lead_approvals", la_id, company_id=c["id"], user_id=1, decision="bloquear",
            note="Reputação pública crítica.", created_at=(NOW - timedelta(days=2)).isoformat())
        la_id += 1

# Mensagens e tentativas de contato
om_id = 1
oa_id = 1
outreach_statuses = {"CONTACTED", "FOLLOW_UP", "REPLIED", "MEETING_SCHEDULED", "PROPOSAL_SENT",
                     "CONTRACT_SIGNED", "WON_AND_PAID"}
for c in COMPANIES:
    if c["status"] not in outreach_statuses:
        continue
    msg_text = (
        f"Olá, tudo bem? Analisei rapidamente a presença digital da {c['trade']} e encontrei uma "
        f"oportunidade específica em cama, mesa e banho. Vocês têm um catálogo com boa aderência a "
        f"marketplace, mas hoje não encontrei anúncios ativos no Mercado Livre. Eu atuo na implantação "
        f"e escala de Mercado Livre, Amazon e Shopee, olhando margem, estoque, logística e operação. "
        f"Posso te enviar um diagnóstico bem curto com os três pontos que identifiquei?"
    )
    ins("outreach_messages", om_id, company_id=c["id"], channel="whatsapp", step="contato_inicial",
        text=msg_text, approved=True, approved_by="Iago Rodrigues", created_at=(NOW - timedelta(days=2)).isoformat())
    ins("outreach_attempts", oa_id, company_id=c["id"], message_id=om_id, channel="whatsapp",
        status=("REPLIED" if c["status"] in {"REPLIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "CONTRACT_SIGNED", "WON_AND_PAID"} else "SENT"),
        responsible_id=1, sent_at=(NOW - timedelta(days=2)).isoformat(),
        next_follow_up_at=(NOW + timedelta(days=1)).isoformat() if c["status"] == "FOLLOW_UP" else None,
        attempt_number=1, human_confirmed=True, created_at=(NOW - timedelta(days=2)).isoformat())
    om_id += 1
    oa_id += 1

# Conversa + classificação de resposta para quem já respondeu
conv_id = 1
rc_id = 1
replied_statuses = {"REPLIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "CONTRACT_SIGNED", "WON_AND_PAID"}
for c in COMPANIES:
    if c["status"] not in replied_statuses:
        continue
    ins("conversations", conv_id, company_id=c["id"], channel="whatsapp",
        last_message_at=(NOW - timedelta(days=1)).isoformat(), status="aberta")
    classification = "reuniao_marcada" if c["status"] != "REPLIED" else "pediu_diagnostico"
    ins("reply_classifications", rc_id, conversation_id=conv_id, classification=classification,
        note="Resposta registrada manualmente após confirmação humana.",
        classified_at=(NOW - timedelta(days=1)).isoformat())
    conv_id += 1
    rc_id += 1

# ---------------------------------------------------------------------------
# Tarefas (Command Center — seção 12A). Algumas vencem hoje, uma está atrasada.
# ---------------------------------------------------------------------------
task_id = 1
ins("tasks", task_id, title="Follow-up 1: Boa Mesa Utensílios", company_id=15, owner_id=1,
    due_at=NOW.replace(hour=10, minute=0).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=1)).isoformat())
task_id += 1
ins("tasks", task_id, title="Follow-up 1: Textura Casa", company_id=16, owner_id=1,
    due_at=NOW.replace(hour=15, minute=0).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=1)).isoformat())
task_id += 1
ins("tasks", task_id, title="Follow-up 2 atrasado: Varanda Verde Jardinagem", company_id=17, owner_id=1,
    due_at=(NOW - timedelta(days=2)).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=6)).isoformat())
task_id += 1
ins("tasks", task_id, title="Enviar diagnóstico prometido: Alma de Casa Decor", company_id=18, owner_id=1,
    due_at=NOW.replace(hour=17, minute=0).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=1)).isoformat())
task_id += 1
ins("tasks", task_id, title="Preparar briefing pré-call: Ponto Certo Enxovais", company_id=19, owner_id=1,
    due_at=NOW.replace(hour=9, minute=0).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=1)).isoformat())
task_id += 1
ins("tasks", task_id, title="Follow-up de proposta: Raiz Móveis Planejados", company_id=20, owner_id=1,
    due_at=(NOW + timedelta(days=1)).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=3)).isoformat())
task_id += 1
ins("tasks", task_id, title="Cobrar assinatura de contrato: Bambu Casa Sustentável", company_id=21, owner_id=1,
    due_at=NOW.replace(hour=11, minute=0).isoformat(), status="PENDING", created_at=(NOW - timedelta(days=2)).isoformat())
task_id += 1

# ---------------------------------------------------------------------------
# Reunião marcada — Ponto Certo Enxovais (id 19)
# ---------------------------------------------------------------------------
ins("calendar_events", 1, company_id=19, title="Diagnóstico — Ponto Certo Enxovais",
    starts_at=(NOW + timedelta(days=1)).replace(hour=14, minute=0).isoformat(),
    ends_at=(NOW + timedelta(days=1)).replace(hour=14, minute=45).isoformat(),
    meeting_url="https://meet.google.com/exemplo-fake-demo", status="confirmado")
ins("meetings", 1, company_id=19, calendar_event_id=1, owner_id=1, type="diagnostico",
    attended=None, recording_authorized=False)

# ---------------------------------------------------------------------------
# Deals (a partir de APPROVED) + histórico de estágio
# ---------------------------------------------------------------------------
STAGE_BY_STATUS = {
    "FOUND": 1, "IN_AUDIT": 2, "QUALIFIED": 3, "PENDING_APPROVAL": 4, "APPROVED": 5,
    "CONTACTED": 6, "FOLLOW_UP": 7, "REPLIED": 8, "MEETING_SCHEDULED": 10,
    "PROPOSAL_SENT": 13, "CONTRACT_SIGNED": 16, "WON_AND_PAID": 19,
    "NURTURE": 21, "LOST": 22, "BLOCKED": 23,
}
deal_id = 1
sh_id = 1
company_deal = {}
deal_eligible = {"APPROVED", "CONTACTED", "FOLLOW_UP", "REPLIED", "MEETING_SCHEDULED",
                  "PROPOSAL_SENT", "CONTRACT_SIGNED", "WON_AND_PAID", "NURTURE", "LOST"}
for c in COMPANIES:
    stage_id = STAGE_BY_STATUS[c["status"]]
    ins("stage_history", sh_id, deal_id=None, company_id=c["id"], user_id=1, from_stage=None,
        to_stage=STAGES[stage_id - 1][2], reason="Estágio inicial do seed de demonstração",
        next_action="Ver Tabela Mestre", changed_at=(NOW - timedelta(days=3)).isoformat())
    sh_id += 1
    if c["status"] not in deal_eligible:
        continue
    value_proposed = 2000000 if c["status"] not in {"NURTURE", "LOST"} else None
    value_contracted = 2000000 if c["status"] in {"CONTRACT_SIGNED", "WON_AND_PAID"} else None
    loss_reason = "Optou por não investir neste momento (orçamento)." if c["status"] == "LOST" else None
    ins("deals", deal_id, company_id=c["id"], owner_id=1, stage_id=stage_id, offer_id=3,
        value_proposed_cents=value_proposed, value_contracted_cents=value_contracted,
        discount_percent=0, probability=(80 if c["status"] == "WON_AND_PAID" else 40),
        expected_close_date=(TODAY + timedelta(days=20)).isoformat(), loss_reason=loss_reason,
        created_at=(NOW - timedelta(days=8)).isoformat())
    company_deal[c["id"]] = deal_id
    deal_id += 1

# ---------------------------------------------------------------------------
# Proposta — Raiz Móveis Planejados (id 20)
# ---------------------------------------------------------------------------
ins("proposals", 1, company_id=20, deal_id=company_deal[20], offer_id=3, status="SENT",
    valid_until=(TODAY + timedelta(days=10)).isoformat(), created_at=(NOW - timedelta(days=3)).isoformat())
ins("proposal_versions", 1, proposal_id=1, price_version_id=3, final_price_cents=2000000,
    discount_percent=0, scope_summary="Implantação Marketplace 90 — Mercado Livre, Amazon e Shopee.",
    payment_terms="50% na assinatura, 25% em 30 dias, 25% em 60 dias.", version=1,
    created_at=(NOW - timedelta(days=3)).isoformat())

# ---------------------------------------------------------------------------
# Contrato assinado, aguardando pagamento — Bambu Casa Sustentável (id 21)
# ---------------------------------------------------------------------------
ins("proposals", 2, company_id=21, deal_id=company_deal[21], offer_id=3, status="ACCEPTED",
    valid_until=(TODAY + timedelta(days=5)).isoformat(), created_at=(NOW - timedelta(days=6)).isoformat())
ins("proposal_versions", 2, proposal_id=2, price_version_id=3, final_price_cents=2000000,
    discount_percent=0, scope_summary="Implantação Marketplace 90 — Mercado Livre e Shopee.",
    payment_terms="50% na assinatura, 25% em 30 dias, 25% em 60 dias.", version=1,
    created_at=(NOW - timedelta(days=6)).isoformat())
ins("contracts", 1, company_id=21, deal_id=company_deal[21], proposal_id=2, status="SIGNED",
    sent_at=(NOW - timedelta(days=4)).isoformat(), signed_at=(NOW - timedelta(days=1)).isoformat(),
    created_at=(NOW - timedelta(days=4)).isoformat())
ins("payments", 1, contract_id=1, method="PIX")
ins("installments", 1, payment_id=1, seq=1, amount_cents=1000000, due_date=(TODAY + timedelta(days=2)).isoformat(), status="PENDING")
ins("installments", 2, payment_id=1, seq=2, amount_cents=500000, due_date=(TODAY + timedelta(days=32)).isoformat(), status="PENDING")
ins("installments", 3, payment_id=1, seq=3, amount_cents=500000, due_date=(TODAY + timedelta(days=62)).isoformat(), status="PENDING")

# ---------------------------------------------------------------------------
# Ganho e recebido — Giton Mochilas & Cia (id 22) — inspirado no case público
# (Bárbara e Giton), com valores fictícios, sem reutilizar dado real algum.
# ---------------------------------------------------------------------------
ins("proposals", 3, company_id=22, deal_id=company_deal[22], offer_id=3, status="ACCEPTED",
    valid_until=(TODAY - timedelta(days=5)).isoformat(), created_at=(NOW - timedelta(days=20)).isoformat())
ins("proposal_versions", 3, proposal_id=3, price_version_id=3, final_price_cents=2000000,
    discount_percent=0, scope_summary="Implantação Marketplace 90 — Mercado Livre, Amazon e Shopee + marca própria.",
    payment_terms="50% na assinatura, 25% em 30 dias, 25% em 60 dias.", version=1,
    created_at=(NOW - timedelta(days=20)).isoformat())
ins("contracts", 2, company_id=22, deal_id=company_deal[22], proposal_id=3, status="SIGNED",
    sent_at=(NOW - timedelta(days=18)).isoformat(), signed_at=(NOW - timedelta(days=16)).isoformat(),
    created_at=(NOW - timedelta(days=18)).isoformat())
ins("payments", 2, contract_id=2, method="PIX")
ins("installments", 4, payment_id=2, seq=1, amount_cents=1000000, due_date=(TODAY - timedelta(days=15)).isoformat(),
    status="RECEIVED", paid_at=(NOW - timedelta(days=15)).isoformat())
ins("installments", 5, payment_id=2, seq=2, amount_cents=500000, due_date=(TODAY + timedelta(days=15)).isoformat(), status="PENDING")
ins("installments", 6, payment_id=2, seq=3, amount_cents=500000, due_date=(TODAY + timedelta(days=45)).isoformat(), status="PENDING")
ins("revenue_events", 1, installment_id=4, company_id=22, type="entrada_recebida", amount_cents=1000000,
    occurred_at=(NOW - timedelta(days=15)).isoformat())
ins("onboarding_projects", 1, company_id=22, kickoff_at=(NOW - timedelta(days=14)).isoformat(),
    schedule="Kickoff realizado; cronograma de 90 dias em andamento.", created_at=(NOW - timedelta(days=14)).isoformat())

# ---------------------------------------------------------------------------
# Compliance: exemplo de opt-out e blocklist
# ---------------------------------------------------------------------------
ins("opt_outs", 1, company_id=24, contact_value="contato@estilounicoutilidades.com.br",
    reason="Pediu para não ser mais contatado.", created_at=(NOW - timedelta(days=5)).isoformat())
ins("blocklist", 1, type="cnpj", value=fake_cnpj(25).replace(".", "").replace("/", "").replace("-", ""),
    reason="Reputação pública crítica identificada na auditoria (fictício).", created_at=(NOW - timedelta(days=5)).isoformat())

ins("audit_logs", 1, user_id=1, entity="company", entity_id="25", action="block",
    before_json='{"status": "IN_AUDIT"}', after_json='{"status": "BLOCKED"}',
    created_at=(NOW - timedelta(days=5)).isoformat())

stmts.append("COMMIT;")

# ---------------------------------------------------------------------------
# Corrigir sequences depois de inserir com IDs explícitos
# ---------------------------------------------------------------------------
SEQ_TABLES = [
    "users", "segments", "service_packages", "price_versions", "discount_policies",
    "pipeline_stages", "follow_up_rules", "campaigns", "campaign_budgets", "companies",
    "contacts", "sources", "marketplace_presences", "audit_findings", "lead_scores",
    "lead_approvals", "outreach_messages", "outreach_attempts", "conversations",
    "reply_classifications", "tasks", "calendar_events", "meetings", "deals",
    "stage_history", "proposals", "proposal_versions", "contracts", "payments",
    "installments", "revenue_events", "onboarding_projects", "opt_outs", "blocklist",
    "audit_logs",
]
for t in SEQ_TABLES:
    stmts.append(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), COALESCE((SELECT MAX(id) FROM {t}), 1));")

if __name__ == "__main__":
    out_path = ROOT / "packages" / "database" / "sql" / "999_seed_generated.sql"
    out_path.write_text("\n".join(stmts), encoding="utf-8")
    print(f"Escrevendo {len(stmts)} statements em {out_path}")
    output = execute_file(str(out_path))
    print(output[-2000:])
    print("Seed aplicado com sucesso.")
