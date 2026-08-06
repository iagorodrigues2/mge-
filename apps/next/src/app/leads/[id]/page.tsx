import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead, listPackages, listProposals } from "@/lib/db";
import { dueInfo } from "@/lib/cadence";
import PostButton from "@/components/PostButton";
import ProposalForm from "@/components/ProposalForm";
import EnrichForm from "@/components/EnrichForm";
import { brl } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STEP_LABEL: Record<string, string> = {
  contato_inicial: "Contato inicial", followup_1: "Follow-up 1",
  followup_2: "Follow-up 2", encerramento: "Encerramento",
};

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  const packages = (await listPackages()).filter((p) => p.ativo);
  const proposals = (await listProposals()).filter((p) => p.leadId === id);
  const cad = dueInfo(lead);
  const s = lead.score;
  const canPropose = ["em_conversa", "reuniao_marcada", "contatado"].includes(lead.stage);

  return (
    <main>
      <p className="sub"><Link href="/leads">← Leads</Link></p>
      <h1>{lead.empresa}</h1>
      <p className="sub">{lead.segmento} · {[lead.cidade, lead.uf].filter(Boolean).join("/")} · origem: {lead.source}</p>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Score {s?.total ?? "—"} · <span className={`badge ${s?.potential}`}>{s?.potential}</span></h2>
          {s?.model === "icp" && (
            <>
              <p className="hint" style={{ marginTop: 0 }}>Perfil: <b>{s.perfil_tipo}</b></p>
              <table>
                <tbody>
                  {([
                    ["Perfil ICP (tipo)", s.perfil_icp, 30], ["Lacuna de marketplace", s.lacuna_marketplace, 25],
                    ["Porte & tradição", s.porte_tradicao, 15], ["Produto & marca própria", s.produto_marca, 15],
                    ["Contatabilidade", s.contatabilidade, 15],
                  ] as [string, number, number][]).map(([k, v, max]) => (
                    <tr key={k}><td>{k}</td><td style={{ textAlign: "right" }}>{v}/{max}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {s?.model === "seller" && <p className="hint" style={{ marginTop: 0 }}>{s.tipo}</p>}
          {s && s.model !== "icp" && s.model !== "seller" && (
            <table>
              <tbody>
                {([
                  ["Product fit", s.product_fit, 20], ["Marketplace gap", s.marketplace_gap, 20],
                  ["Business structure", s.business_structure, 15], ["Catalog quality", s.catalog_quality, 15],
                  ["Investment signals", s.investment_signals, 10], ["Contactability", s.contactability, 10],
                  ["Problem clarity", s.problem_clarity, 10],
                ] as [string, number, number][]).map(([k, v, max]) => (
                  <tr key={k}><td>{k}</td><td style={{ textAlign: "right" }}>{v}/{max}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint" style={{ marginTop: 10 }}>Confiança: {s?.confidence}. {s?.rationale}</p>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Cadência</h2>
          <p className="hint">Estágio: <b>{lead.stage}</b></p>
          {cad.inCadence ? (
            <>
              <p className="hint">Próxima etapa: <b>{cad.nextStep ? STEP_LABEL[cad.nextStep] : "cadência encerrada"}</b> {cad.due ? "· vencida" : "· aguardando intervalo"}</p>
              <div className="row">
                {cad.nextStep && (
                  <PostButton url={`/api/leads/${id}/cadence`} body={{ force: true }} className="primary"
                    label={`Enviar ${STEP_LABEL[cad.nextStep]}`} />
                )}
                <PostButton url={`/api/leads/${id}/reply`} body={{ positive: true }} label="Registrar resposta (interesse)"
                  successText="Movido para 'em conversa'" />
              </div>
            </>
          ) : (
            <p className="hint">Lead fora da cadência ativa (ainda não contatado, respondeu, ou opt-out).</p>
          )}
          {lead.stage === "novo" || lead.stage === "pesquisado" || lead.stage === "aprovado" ? (
            (lead.score?.potential === "A" || lead.score?.potential === "B") && (
              <div style={{ marginTop: 10 }}>
                <PostButton url={`/api/leads/${id}/approve`} className="primary" label="✓ Aprovar e enviar 1º contato" />
              </div>
            )
          ) : null}
        </div>
      </div>

      {lead.seller && (
        <>
          <h2>Métricas do seller · Mercado Livre (JoomPulse)</h2>
          <div className="panel">
            <table>
              <tbody>
                {([
                  ["Receita média/mês", `R$ ${Math.round(lead.seller.receitaMes).toLocaleString("pt-BR")}`],
                  ["Vendas/mês", Math.round(lead.seller.vendasMes).toLocaleString("pt-BR")],
                  ["Vendas totais", Math.round(lead.seller.vendasTotal).toLocaleString("pt-BR")],
                  ["Produtos", String(lead.seller.produtos)],
                  ["Ticket médio", `R$ ${lead.seller.ticket.toFixed(2)}`],
                  ["Avaliação", `${lead.seller.rating} / 5`],
                  ["Tendência de vendas", `${lead.seller.trend > 0 ? "+" : ""}${lead.seller.trend.toFixed(1)}%`],
                  ["No ML desde", lead.seller.registrado ? String(lead.seller.registrado).slice(0, 10) : "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <tr key={k}><td style={{ color: "var(--muted)" }}>{k}</td><td style={{ textAlign: "right" }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="hint" style={{ marginTop: 10 }}>Fonte: JoomPulse. Contato via Mercado Livre (o seller não expõe telefone/e-mail público).</p>
          </div>
        </>
      )}

      <h2>Dados cadastrais {lead.enriched_at && <span className={`badge ${lead.situacao_cadastral === "ATIVA" ? "A" : "NAO_ABORDAR"}`}>{lead.situacao_cadastral}</span>}</h2>
      <div className="panel">
        {lead.enriched_at ? (
          <>
            <table>
              <tbody>
                {([
                  ["CNPJ", lead.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")],
                  ["Razão social", lead.razao_social],
                  ["Nome fantasia", lead.nome_fantasia],
                  ["CNAE", [lead.cnae, lead.cnae_descricao].filter(Boolean).join(" — ")],
                  ["Porte", lead.porte],
                  ["Abertura", lead.data_abertura],
                  ["Telefone", lead.telefone], ["E-mail", lead.email],
                ] as [string, string | undefined][])
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k}><td style={{ color: "var(--muted)" }}>{k}</td><td>{v}</td></tr>
                  ))}
              </tbody>
            </table>
            <p className="hint" style={{ marginTop: 10 }}>
              Confirmado na Receita em {new Date(lead.enriched_at).toLocaleString("pt-BR")} via {lead.enrich_source}.
            </p>
            <div style={{ marginTop: 12 }}><EnrichForm leadId={id} initialCnpj={lead.cnpj} /></div>
          </>
        ) : (
          <EnrichForm leadId={id} initialCnpj={lead.cnpj} />
        )}
      </div>

      <h2>Mensagens enviadas ({lead.attempts.length})</h2>
      <div className="panel">
        {lead.attempts.length === 0 && <p className="hint">Nenhuma mensagem ainda.</p>}
        {lead.attempts.map((a, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
            <div className="hint">
              <b>{STEP_LABEL[a.step] ?? a.step}</b> · {a.channel} · {a.status} · {new Date(a.at).toLocaleString("pt-BR")}
              {a.status === "assistido" && a.detail?.startsWith("http") && <> · <a className="wa" href={a.detail} target="_blank" rel="noreferrer">abrir WhatsApp ↗</a></>}
            </div>
            <div className="msg">{a.message}</div>
          </div>
        ))}
      </div>

      {canPropose && (
        <>
          <h2>Criar proposta</h2>
          <div className="panel">
            <ProposalForm leadId={id} packages={packages} />
          </div>
        </>
      )}

      {proposals.length > 0 && (
        <>
          <h2>Propostas deste lead</h2>
          <div className="panel">
            {proposals.map((p) => (
              <div key={p.id} className="hint" style={{ padding: "4px 0" }}>
                {p.nome} · {brl(p.valor)} · <b>{p.status}</b> — <Link href="/propostas">gerir em Propostas →</Link>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
