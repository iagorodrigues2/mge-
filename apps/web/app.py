"""
Marketplace Growth Engine — painel (apps/web).

Stack: Flask + Jinja2 (já instalados na sandbox, sem dependência de registro
de pacotes) + PostgreSQL nativo via packages/database/db.py.

Rodar: python3 apps/web/app.py  (porta 8000)
"""

import sys
import urllib.parse
from pathlib import Path

from flask import Flask, redirect, render_template, request, url_for

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages" / "database"))
sys.path.insert(0, str(ROOT / "packages" / "agents"))

import data  # noqa: E402
from copywriter import TEMPLATES, generate_message, lint_message  # noqa: E402
from compliance import check_business_hours  # noqa: E402

app = Flask(__name__)


def cents_to_brl(cents) -> str:
    try:
        value = int(cents or 0) / 100
    except (TypeError, ValueError):
        return "—"
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


app.jinja_env.filters["brl"] = cents_to_brl


@app.route("/")
def command_center():
    metrics = data.dashboard_metrics()
    business_hours = check_business_hours()
    return render_template("command_center.html", m=metrics, business_hours=business_hours)


@app.route("/leads")
def leads():
    status = request.args.get("status") or None
    segment_id = request.args.get("segment_id") or None
    q = request.args.get("q") or None
    companies = data.list_companies(status=status, segment_id=segment_id, q=q)
    segments = data.list_segments()
    return render_template("leads.html", companies=companies, segments=segments,
                            status=status, segment_id=segment_id, q=q or "")


@app.route("/leads/<int:company_id>")
def lead_detail(company_id: int):
    company = data.get_company(company_id)
    if not company:
        return "Empresa não encontrada", 404
    business_hours = check_business_hours()
    return render_template("lead_detail.html", c=company, business_hours=business_hours)


@app.route("/leads/<int:company_id>/approve", methods=["POST"])
def lead_approve(company_id: int):
    decision = request.form.get("decision", "aprovar")
    note = request.form.get("note", "")
    data.approve_lead(company_id, decision, note)
    return redirect(url_for("lead_detail", company_id=company_id))

@app.route("/leads/<int:company_id>/whatsapp")
def lead_whatsapp(company_id: int):
    company = data.get_company(company_id)
    if not company:
        return "Empresa não encontrada", 404
    msg = None
    for m in company["outreach_messages"]:
        if m["approved"] in ("t", "True", True):
            msg = m
            break
    phone = None
    for ct in company["contacts"]:
        if ct.get("whatsapp"):
            phone = ct["whatsapp"]
            break
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    wa_link = None
    if msg and digits:
        text = urllib.parse.quote(msg["text"])
        wa_link = f"https://wa.me/55{digits}?text={text}" if not digits.startswith("55") else f"https://wa.me/{digits}?text={text}"
    business_hours = check_business_hours()
    return render_template("whatsapp_assisted.html", c=company, msg=msg, wa_link=wa_link,
                            business_hours=business_hours)


@app.route("/leads/<int:company_id>/whatsapp/confirm", methods=["POST"])
def lead_whatsapp_confirm(company_id: int):
    attempt_id = request.form.get("attempt_id")
    if attempt_id:
        data.confirm_whatsapp_sent(int(attempt_id))
    return redirect(url_for("lead_detail", company_id=company_id))


@app.route("/kanban")
def kanban():
    board = data.kanban_board()
    return render_template("kanban.html", board=board)


@app.route("/kanban/move", methods=["POST"])
def kanban_move():
    deal_id = int(request.form["deal_id"])
    new_stage = request.form["new_stage_code"]
    reason = request.form.get("reason", "Movido manualmente pelo Kanban")
    data.move_deal_stage(deal_id, new_stage, reason)
    return redirect(url_for("kanban"))


@app.route("/campanhas")
def campanhas():
    return render_template("campanhas.html", campaigns=data.list_campaigns())


@app.route("/propostas")
def propostas():
    return render_template("propostas.html", proposals=data.proposals_overview())


@app.route("/financeiro")
def financeiro():
    return render_template("financeiro.html", **data.financial_overview())


@app.route("/templates-mensagem")
def templates_mensagem():
    examples = {}
    sample_fields = {
        "nome": "Marina", "empresa": "Casa Bela Utilidades",
        "canal_ou_categoria": "cama, mesa e banho",
        "fato_objetivo": "não encontrei anúncios ativos no Mercado Livre",
        "oportunidade_real": "ausência total de canal no Mercado Livre",
        "ponto_1": "catálogo com boa aderência a marketplace",
        "ponto_2": "nenhum anúncio ativo hoje",
        "ponto_3": "concorrentes diretos já dominando a categoria",
    }
    for step, tmpl in TEMPLATES.items():
        text = generate_message(step, sample_fields)
        examples[step] = dict(template=tmpl, rendered=text, lint=lint_message(text))
    return render_template("templates_mensagem.html", examples=examples)


@app.route("/compliance")
def compliance():
    return render_template("compliance.html", **data.compliance_overview(), business_hours=check_business_hours())


@app.route("/configuracoes")
def configuracoes():
    return render_template("configuracoes.html", packages=data.service_packages_with_prices())


@app.route("/tasks/<int:task_id>/complete", methods=["POST"])
def task_complete(task_id: int):
    data.complete_task(task_id)
    return redirect(request.referrer or url_for("command_center"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
