import Link from "next/link";
import { listLeads, listProposals } from "@/lib/db";
import { revenueFromDeals } from "@/lib/financeiro";
import { isDue } from "@/lib/cadence";
import ScoutForm from "@/components/ScoutForm";
import PostButton from "@/components/PostButton";
import { brl } from "@/lib/pricing";
import type { LeadStage } from "@/lib/types";

export const dynamic = "force-dynamic";

const FUNNEL: { key: LeadStage | "total" | "score65" | "aprovaveis"; label: string }[] = [
  { key: "total", label: "Pesquisados" },
  { key: "score65", label: "Score ≥ 65" },
  { key: "aprovaveis", label: "Aprováveis (A/B)" },
  { key: "contatado", label: "Contatados" },
  { key: "em_conversa", label: "Em conversa" },
  { key: "reuniao_marcada", label: "Reuniões" },
  { key: "proposta_enviada", label: "Propostas" },
  { key: "ganho", label: "Ganhos" },
];

export default async function Home() {
  const leads = await listLeads();
  const proposals = await listProposals();
  const rev = await revenueFromDeals();
  const potencial = proposals.filter((p) => p.status === "rascunho" || p.status === "enviada").reduce((s, p) => s + p.valor, 0);
  const dueCount = leads.filter((l) => isDue(l)).length;
  const count = (fn: (s: LeadStage) => boolean) => leads.filter((l) => fn(l.stage)).length;
  const metrics: Record<string, number> = {
    total: leads.length,
    score65: leads.filter((l) => (l.score?.total ?? 0) >= 65).length,
    aprovaveis: leads.filter((l) => l.score?.potential === "A" || l.score?.potential === "B").length,
    contatado: count((s) => s === "contatado"),
    em_conversa: count((s) => s === "em_conversa"),
    reuniao_marcada: count((s) => s === "reuniao_marcada"),
    proposta_enviada: count((s) => s === "proposta_enviada"),
    ganho: count((s) => s === "ganho"),
  };

  return (
    <main>
      <h1>Command Center</h1>
      <p className="sub">Máquina de vendas — consultoria e implantação de marketplace (Iago Rodrigues).</p>

      <div className="grid funnel">
        {FUNNEL.map((f) => (
          <div className="card" key={f.key}>
            <div className="n">{metrics[f.key] ?? 0}</div>
            <div className="l">{f.label}</div>
          </div>
        ))}
      </div>

      <h2>Receita (do potencial ao recebido)</h2>
      <div className="grid funnel">
        <div className="card"><div className="n">{brl(potencial)}</div><div className="l">Potencial (propostas)</div></div>
        <div className="card"><div className="n">{brl(rev.contratada)}</div><div className="l">Contratada</div></div>
        <div className="card"><div className="n" style={{ color: "#4cd48f" }}>{brl(rev.recebida)}</div><div className="l">Recebida</div></div>
        <div className="card"><div className="n">{brl(rev.aReceber)}</div><div className="l">A receber</div></div>
      </div>

      <h2>Prospecção</h2>
      <ScoutForm />

      <h2>Cadência automática</h2>
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <b>{dueCount}</b> follow-up(s) vencido(s) para enviar.
            <div className="hint">Envia a próxima etapa (follow-up 1 → 2 → encerramento) de quem foi contatado e ainda não respondeu, respeitando o intervalo e o horário comercial.</div>
          </div>
          <PostButton url="/api/cadence/run" className="primary" label="▶ Rodar cadência (enviar devidos)" />
        </div>
      </div>

      <h2>Como funciona o fluxo</h2>
      <div className="panel hint">
        1. <b>Buscar por nicho</b> → o Scout pesquisa empresas e calcula o score. &nbsp;
        2. Abra a <Link href="/leads">Tabela de Leads</Link> e revise os A/B. &nbsp;
        3. Clique <b>Aprovar e enviar</b> → a mensagem é formulada com os fatos do lead, passa pela
        compliance e sai por WhatsApp (e e-mail, se houver). A sua aprovação é o clique humano exigido —
        nada é enviado sem ela.
      </div>
    </main>
  );
}
