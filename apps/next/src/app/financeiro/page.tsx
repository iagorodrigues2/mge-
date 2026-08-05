import Link from "next/link";
import { listDeals, listProposals } from "@/lib/db";
import { revenueFromDeals } from "@/lib/financeiro";
import { brl } from "@/lib/pricing";
import PostButton from "@/components/PostButton";

export const dynamic = "force-dynamic";

const DEAL_LABEL: Record<string, string> = {
  aguardando_entrada: "Aguardando entrada", entrada_recebida: "Ganho e recebido",
  em_andamento: "Em andamento", quitado: "Quitado", inadimplente: "Inadimplente", cancelado: "Cancelado",
};

export default async function FinanceiroPage() {
  const deals = await listDeals();
  const proposals = await listProposals();
  const rev = await revenueFromDeals();
  const potencial = proposals.filter((p) => p.status === "rascunho" || p.status === "enviada").reduce((s, p) => s + p.valor, 0);

  return (
    <main>
      <h1>Financeiro</h1>
      <p className="sub">“Ganho e recebido” só conta após a entrada efetivamente paga (seção 12H).</p>

      <div className="grid funnel">
        <div className="card"><div className="n">{brl(potencial)}</div><div className="l">Receita potencial (propostas)</div></div>
        <div className="card"><div className="n">{brl(rev.contratada)}</div><div className="l">Contratada (aceitas)</div></div>
        <div className="card"><div className="n" style={{ color: "#4cd48f" }}>{brl(rev.recebida)}</div><div className="l">Recebida (pago)</div></div>
        <div className="card"><div className="n">{brl(rev.aReceber)}</div><div className="l">A receber</div></div>
      </div>

      {deals.length === 0 && (
        <div className="notice" style={{ marginTop: 20 }}>Nenhum negócio ainda. Aceite uma proposta em Propostas para gerar o plano de pagamento.</div>
      )}

      <div className="grid" style={{ gap: 16, marginTop: 16 }}>
        {deals.map((d) => (
          <div className="panel" key={d.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0 }}>{d.empresa}</h2>
                <span className="badge B">{DEAL_LABEL[d.status]}</span>
                <span className="hint"> · <Link href={`/leads/${d.leadId}`}>ver lead →</Link></span>
              </div>
              <div className="score">{brl(d.valor)}</div>
            </div>
            <table style={{ marginTop: 12 }}>
              <thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>
                {d.installments.map((i) => (
                  <tr key={i.n}>
                    <td>{i.label}</td>
                    <td>{brl(i.valor)}</td>
                    <td className="hint">{i.dueDate ?? "—"}</td>
                    <td>{i.status === "pago" ? <span className="msg ok">pago{i.paidAt ? ` · ${new Date(i.paidAt).toLocaleDateString("pt-BR")}` : ""}</span> : <span className="hint">pendente</span>}</td>
                    <td>
                      {i.status !== "pago" && (
                        <PostButton url={`/api/deals/${d.id}/pay`} body={{ n: i.n }} className="primary"
                          label="Confirmar pagamento" successText="pago ✓" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </main>
  );
}
