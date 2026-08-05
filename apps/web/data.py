"""
Camada de dados do painel (apps/web). Consultas SQL diretas via
packages/database/db.py (psql em subprocess — ver nota em db.py sobre por que
não é um ORM nesta sessão).
"""

import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages" / "database"))

from db import query, execute, quote  # noqa: E402

TZ = ZoneInfo("America/Sao_Paulo")


def _today():
    return datetime.now(TZ).date()


def dashboard_metrics() -> dict:
    today = _today().isoformat()
    companies_researched = int(query("SELECT count(*) AS n FROM companies")[0]["n"])
    qualified = int(query("SELECT count(*) AS n FROM lead_scores WHERE potential IN ('A','B')")[0]["n"])
    approved_msgs = int(query("SELECT count(*) AS n FROM outreach_messages WHERE approved = TRUE")[0]["n"])
    contacted = int(query("SELECT count(*) AS n FROM outreach_attempts")[0]["n"])
    replies = int(query("SELECT count(*) AS n FROM reply_classifications")[0]["n"])
    positive_replies = int(query(
        "SELECT count(*) AS n FROM reply_classifications WHERE classification IN "
        "('interessado','pediu_diagnostico','pediu_informacao','reuniao_marcada')"
    )[0]["n"])
    meetings = int(query("SELECT count(*) AS n FROM meetings")[0]["n"])
    proposals = int(query("SELECT count(*) AS n FROM proposals")[0]["n"])
    won = int(query("SELECT count(*) AS n FROM deals d JOIN pipeline_stages ps ON ps.id=d.stage_id WHERE ps.code='ganho_recebido'")[0]["n"])
    pipeline_value = query(
        "SELECT COALESCE(SUM(value_proposed_cents),0) AS v FROM deals d JOIN pipeline_stages ps ON ps.id=d.stage_id "
        "WHERE ps.code NOT IN ('perdido','bloqueado','ganho_recebido')"
    )[0]["v"]
    received = query("SELECT COALESCE(SUM(amount_cents),0) AS v FROM revenue_events")[0]["v"]

    due_today = query(
        f"SELECT t.id, t.title, t.due_at, t.status, c.trade_name FROM tasks t "
        f"LEFT JOIN companies c ON c.id=t.company_id "
        f"WHERE t.status='PENDING' AND t.due_at::date = '{today}' ORDER BY t.due_at"
    )
    overdue = query(
        f"SELECT t.id, t.title, t.due_at, t.status, c.trade_name FROM tasks t "
        f"LEFT JOIN companies c ON c.id=t.company_id "
        f"WHERE t.status='PENDING' AND t.due_at::date < '{today}' ORDER BY t.due_at"
    )
    meetings_today = query(
        f"SELECT ce.title, ce.starts_at, c.trade_name FROM calendar_events ce "
        f"LEFT JOIN companies c ON c.id=ce.company_id "
        f"WHERE ce.starts_at::date = '{today}' ORDER BY ce.starts_at"
    )
    replied_new = query(
        "SELECT c.id, c.trade_name, rc.classification, rc.classified_at FROM reply_classifications rc "
        "JOIN conversations conv ON conv.id=rc.conversation_id "
        "JOIN companies c ON c.id=conv.company_id ORDER BY rc.classified_at DESC LIMIT 5"
    )
    proposals_open = query(
        "SELECT p.id, c.trade_name, p.status, p.valid_until FROM proposals p "
        "JOIN companies c ON c.id=p.company_id WHERE p.status IN ('SENT','VIEWED') ORDER BY p.valid_until"
    )
    contracts_pending = query(
        "SELECT ct.id, c.trade_name, ct.status FROM contracts ct JOIN companies c ON c.id=ct.company_id "
        "WHERE ct.status IN ('SENT','VIEWED') ORDER BY ct.id"
    )
    payments_due = query(
        "SELECT i.id, c.trade_name, i.amount_cents, i.due_date, i.status FROM installments i "
        "JOIN payments pay ON pay.id=i.payment_id JOIN contracts ct ON ct.id=pay.contract_id "
        "JOIN companies c ON c.id=ct.company_id WHERE i.status='PENDING' ORDER BY i.due_date LIMIT 8"
    )

    return dict(
        companies_researched=companies_researched, qualified=qualified, approved_msgs=approved_msgs,
        contacted=contacted, replies=replies, positive_replies=positive_replies, meetings=meetings,
        proposals=proposals, won=won, pipeline_value_cents=int(pipeline_value), received_cents=int(received),
        due_today=due_today, overdue=overdue, meetings_today=meetings_today, replied_new=replied_new,
        proposals_open=proposals_open, contracts_pending=contracts_pending, payments_due=payments_due,
    )


def list_companies(status: str | None = None, segment_id: str | None = None, q: str | None = None) -> list[dict]:
    where = ["1=1"]
    if status:
        where.append(f"c.status = {quote(status)}")
    if segment_id:
        where.append(f"c.segment_id = {quote(int(segment_id))}")
    if q:
        like = quote(f"%{q}%")
        where.append(f"(c.trade_name ILIKE {like} OR c.legal_name ILIKE {like} OR c.city ILIKE {like})")
    sql = f"""
        SELECT c.id, c.trade_name, c.legal_name, c.city, c.state, c.status, c.cnpj,
               seg.name AS segment_name,
               ls.total AS score_total, ls.potential AS score_potential, ls.confidence AS score_confidence,
               camp.name AS campaign_name
        FROM companies c
        LEFT JOIN segments seg ON seg.id = c.segment_id
        LEFT JOIN campaigns camp ON camp.id = c.campaign_id
        LEFT JOIN LATERAL (
            SELECT total, potential, confidence FROM lead_scores WHERE company_id = c.id
            ORDER BY generated_at DESC LIMIT 1
        ) ls ON TRUE
        WHERE {' AND '.join(where)}
        ORDER BY c.id
    """
    return query(sql)


def get_company(company_id: int) -> dict | None:
    rows = query(f"SELECT * FROM companies WHERE id = {int(company_id)}")
    if not rows:
        return None
    company = rows[0]
    company["contacts"] = query(f"SELECT * FROM contacts WHERE company_id = {int(company_id)}")
    company["sources"] = query(f"SELECT * FROM sources WHERE company_id = {int(company_id)}")
    company["marketplace_presences"] = query(f"SELECT * FROM marketplace_presences WHERE company_id = {int(company_id)}")
    company["audit_findings"] = query(f"SELECT * FROM audit_findings WHERE company_id = {int(company_id)}")
    company["lead_scores"] = query(f"SELECT * FROM lead_scores WHERE company_id = {int(company_id)} ORDER BY generated_at DESC")
    company["outreach_messages"] = query(f"SELECT * FROM outreach_messages WHERE company_id = {int(company_id)} ORDER BY created_at")
    company["outreach_attempts"] = query(
        f"SELECT * FROM outreach_attempts WHERE company_id = {int(company_id)} ORDER BY created_at"
    )
    company["conversations"] = query(f"SELECT * FROM conversations WHERE company_id = {int(company_id)}")
    for conv in company["conversations"]:
        conv["replies"] = query(f"SELECT * FROM reply_classifications WHERE conversation_id = {int(conv['id'])} ORDER BY classified_at")
    company["tasks"] = query(f"SELECT * FROM tasks WHERE company_id = {int(company_id)} ORDER BY due_at")
    company["deal"] = query(
        f"SELECT d.*, ps.name AS stage_name, ps.code AS stage_code FROM deals d "
        f"JOIN pipeline_stages ps ON ps.id = d.stage_id WHERE company_id = {int(company_id)} LIMIT 1"
    )
    company["proposals"] = query(f"SELECT * FROM proposals WHERE company_id = {int(company_id)}")
    company["contracts"] = query(f"SELECT * FROM contracts WHERE company_id = {int(company_id)}")
    company["approvals"] = query(f"SELECT * FROM lead_approvals WHERE company_id = {int(company_id)} ORDER BY created_at")
    return company


def list_segments() -> list[dict]:
    return query("SELECT * FROM segments ORDER BY \"order\"")


def list_campaigns() -> list[dict]:
    return query(
        "SELECT c.*, seg.name AS segment_name, u.name AS owner_name, sp.name AS offer_name "
        "FROM campaigns c LEFT JOIN segments seg ON seg.id=c.segment_id "
        "LEFT JOIN users u ON u.id=c.owner_id LEFT JOIN service_packages sp ON sp.id=c.offer_id ORDER BY c.id"
    )


def kanban_board() -> list[dict]:
    stages = query("SELECT * FROM pipeline_stages ORDER BY \"order\"")
    deals = query(
        "SELECT d.id AS deal_id, d.stage_id, d.value_proposed_cents, d.value_contracted_cents, "
        "c.id AS company_id, c.trade_name, c.city, c.state, ls.total AS score_total, ls.potential "
        "FROM deals d JOIN companies c ON c.id=d.company_id "
        "LEFT JOIN LATERAL (SELECT total, potential FROM lead_scores WHERE company_id=c.id ORDER BY generated_at DESC LIMIT 1) ls ON TRUE "
        "ORDER BY d.id"
    )
    by_stage: dict[str, list[dict]] = {s["id"]: [] for s in stages}
    for d in deals:
        by_stage.setdefault(d["stage_id"], []).append(d)
    board = []
    for s in stages:
        board.append({"stage": s, "deals": by_stage.get(s["id"], [])})
    return board


def service_packages_with_prices() -> list[dict]:
    packages = query("SELECT * FROM service_packages ORDER BY id")
    for p in packages:
        p["prices"] = query(
            f"SELECT * FROM price_versions WHERE package_id = {int(p['id'])} ORDER BY is_founder_offer, id"
        )
    return packages


def compliance_overview() -> dict:
    return dict(
        blocklist=query("SELECT * FROM blocklist ORDER BY created_at DESC"),
        opt_outs=query(
            "SELECT o.*, c.trade_name FROM opt_outs o LEFT JOIN companies c ON c.id=o.company_id ORDER BY o.created_at DESC"
        ),
        audit_logs=query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 30"),
        blocked_companies=query("SELECT id, trade_name, blocked_reason FROM companies WHERE blocked = TRUE"),
    )


def proposals_overview() -> list[dict]:
    return query(
        "SELECT p.id, c.trade_name, p.status, p.valid_until, sp.name AS offer_name, "
        "pv.final_price_cents, pv.payment_terms "
        "FROM proposals p JOIN companies c ON c.id=p.company_id "
        "JOIN service_packages sp ON sp.id=p.offer_id "
        "LEFT JOIN LATERAL (SELECT * FROM proposal_versions WHERE proposal_id=p.id ORDER BY version DESC LIMIT 1) pv ON TRUE "
        "ORDER BY p.id"
    )


def financial_overview() -> dict:
    installments = query(
        "SELECT i.*, c.trade_name FROM installments i "
        "JOIN payments pay ON pay.id=i.payment_id JOIN contracts ct ON ct.id=pay.contract_id "
        "JOIN companies c ON c.id=ct.company_id ORDER BY i.due_date"
    )
    revenue = query(
        "SELECT r.*, c.trade_name FROM revenue_events r JOIN companies c ON c.id=r.company_id ORDER BY r.occurred_at DESC"
    )
    return dict(installments=installments, revenue=revenue)


# ---------------------------------------------------------------------------
# Ações (mutações)
# ---------------------------------------------------------------------------

def approve_lead(company_id: int, decision: str, note: str, user_id: int = 1) -> None:
    execute(
        f"INSERT INTO lead_approvals (company_id, user_id, decision, note) "
        f"VALUES ({int(company_id)}, {int(user_id)}, {quote(decision)}, {quote(note)})"
    )
    status_map = {
        "aprovar": "APPROVED", "rejeitar": "LOST", "bloquear": "BLOCKED",
        "espera": "NURTURE", "nova_pesquisa": "IN_AUDIT",
    }
    new_status = status_map.get(decision)
    if new_status:
        execute(f"UPDATE companies SET status = {quote(new_status)}, updated_at = now() WHERE id = {int(company_id)}")
        if new_status == "BLOCKED":
            execute(f"UPDATE companies SET blocked = TRUE, blocked_reason = {quote(note or 'Bloqueado manualmente')} WHERE id = {int(company_id)}")


def confirm_whatsapp_sent(attempt_id: int) -> None:
    """Só é chamado depois que o humano confirma que clicou em enviar (seção 15)."""
    execute(
        f"UPDATE outreach_attempts SET human_confirmed = TRUE, status = 'SENT', sent_at = now() "
        f"WHERE id = {int(attempt_id)}"
    )


def complete_task(task_id: int) -> None:
    execute(f"UPDATE tasks SET status = 'DONE' WHERE id = {int(task_id)}")


def move_deal_stage(deal_id: int, new_stage_code: str, reason: str, user_id: int = 1) -> None:
    current = query(f"SELECT d.*, ps.code AS current_code, ps.name AS current_name FROM deals d JOIN pipeline_stages ps ON ps.id=d.stage_id WHERE d.id = {int(deal_id)}")
    if not current:
        return
    new_stage = query(f"SELECT * FROM pipeline_stages WHERE code = {quote(new_stage_code)}")
    if not new_stage:
        return
    execute(f"UPDATE deals SET stage_id = {int(new_stage[0]['id'])}, updated_at = now() WHERE id = {int(deal_id)}")
    execute(
        f"INSERT INTO stage_history (deal_id, company_id, user_id, from_stage, to_stage, reason, changed_at) "
        f"VALUES ({int(deal_id)}, {int(current[0]['company_id'])}, {int(user_id)}, "
        f"{quote(current[0]['current_name'])}, {quote(new_stage[0]['name'])}, {quote(reason)}, now())"
    )
