import Link from "next/link";
import { listProposals, getPackage } from "@/lib/db";
import { brl } from "@/lib/pricing";
import ProposalActions from "@/components/ProposalActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", enviada: "Enviada", aceita: "Aceita", perdida: "Perdida",
};

export default async function PropostasPage() {
  const proposals = await listProposals();

  return (
    <main>
      <h1>Propostas</h1>
      <p className="sub">{proposals.length} propostas. Crie uma proposta na página de um lead (em conversa).</p>

      {proposals.length === 0 && (
        <div className="notice">Nenhuma proposta ainda. Abra um lead em conversa e use “Criar proposta”.</div>
      )}

      <div className="grid" style={{ gap: 16 }}>
        {await Promise.all(proposals.map(async (p) => {
          const pkg = await getPackage(p.packageCode);
          return (
            <div className="panel" key={p.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{p.empresa} — {p.nome}</h2>
                  <span className="badge B">{STATUS_LABEL[p.status]}</span>
                  <span className="hint"> · <Link href={`/leads/${p.leadId}`}>ver lead →</Link></span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="score">{brl(p.valor)}</div>
                  {pkg?.precoFundador && (
                    <div className="hint">tabela {brl(pkg.precoRef)} · fundador {brl(pkg.precoFundador)}</div>
                  )}
                </div>
              </div>

              <div className="msg" style={{ marginTop: 12, color: "var(--text)" }}>
                <b>Diagnóstico:</b> {p.diagnostico || "—"}{"\n"}
                <b>Escopo:</b> {p.nome} — estruturar catálogo, preço, operação, logística e canais em Mercado Livre, Amazon e Shopee.{"\n"}
                <b>Investimento:</b> {brl(p.valor)}{"\n"}
                <b>Condição de pagamento:</b> {p.condicaoPagamento}{"\n"}
                <b>Próximo passo:</b> formalizar o escopo, reunir acessos e iniciar o diagnóstico detalhado.
              </div>

              <div style={{ marginTop: 12 }}>
                <ProposalActions id={p.id} status={p.status} />
                {p.status === "perdida" && p.lostReason && <div className="hint">Motivo: {p.lostReason}</div>}
              </div>
            </div>
          );
        }))}
      </div>
    </main>
  );
}
