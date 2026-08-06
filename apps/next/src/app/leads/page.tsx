import Link from "next/link";
import { listLeads } from "@/lib/db";
import ApproveButton from "@/components/ApproveButton";
import BatchEnrichButton from "@/components/BatchEnrichButton";
import QualifyButton from "@/components/QualifyButton";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  novo: "Novo", pesquisado: "Pesquisado", aprovado: "Aprovado (não enviado)",
  contatado: "Contatado", em_conversa: "Em conversa", reuniao_marcada: "Reunião marcada",
  proposta_enviada: "Proposta enviada", ganho: "Ganho", perdido: "Perdido",
  nutrir: "Nutrir", nao_abordar: "Não abordar", opt_out: "Opt-out",
};

function lastAttempt(l: Lead) {
  return l.attempts[l.attempts.length - 1];
}

export default async function LeadsPage() {
  const leads = await listLeads();
  const abordaveis = leads.filter((l) => l.score?.potential === "A" || l.score?.potential === "B");
  const enriquecidos = leads.filter((l) => l.enriched_at).length;

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Tabela de Leads</h1>
          <p className="sub" style={{ marginTop: 0 }}>{leads.length} leads · {abordaveis.length} aprováveis (A/B) · {enriquecidos} enriquecidos. Só A e B liberam o botão de aprovar.</p>
        </div>
        {leads.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <QualifyButton />
            <BatchEnrichButton />
          </div>
        )}
      </div>

      {leads.length === 0 && (
        <div className="notice">Nenhum lead ainda. Volte ao Command Center e use “Buscar leads por nicho”.</div>
      )}

      {leads.length > 0 && (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Segmento / Local</th>
                <th>Score</th>
                <th>Classe</th>
                <th>Estágio</th>
                <th>Contato</th>
                <th>Ação / Envio</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const pot = l.score?.potential ?? "NAO_ABORDAR";
                const canApprove = (pot === "A" || pot === "B") && !l.opt_out &&
                  l.stage !== "contatado" && l.stage !== "ganho";
                const att = lastAttempt(l);
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/leads/${l.id}`}><b>{l.empresa}</b></Link>
                      <div className="tag-src">origem: {l.source} · <Link href={`/leads/${l.id}`}>detalhes →</Link></div>
                    </td>
                    <td>
                      {l.segmento}
                      <div className="stage">{[l.cidade, l.uf].filter(Boolean).join("/")}</div>
                    </td>
                    <td>
                      <span className="score">{l.score?.total ?? "—"}</span>
                      {l.score?.model === "icp" && <div className="stage">{l.score.perfil_tipo}</div>}
                      {l.score?.model === "seller" && <div className="stage">{l.score.tipo}</div>}
                      <div className="stage">conf. {l.score?.confidence}</div>
                    </td>
                    <td><span className={`badge ${pot}`}>{pot}</span></td>
                    <td><span className="stage">{STAGE_LABEL[l.stage] ?? l.stage}</span></td>
                    <td>
                      <div className="stage">{l.contato_nome ?? "—"}</div>
                      <div className="stage">{l.telefone ?? "sem telefone"}</div>
                    </td>
                    <td style={{ minWidth: 220 }}>
                      {canApprove ? (
                        <ApproveButton id={l.id} />
                      ) : l.stage === "contatado" ? (
                        <span className="msg ok">✓ contatado</span>
                      ) : (
                        <span className="stage">{pot === "NUTRIR" || pot === "NAO_ABORDAR" ? "abaixo do corte" : "—"}</span>
                      )}
                      {att && (
                        <div className="attempts">
                          {l.attempts.map((a, i) => (
                            <span className="a" key={i}>
                              {a.channel} · {a.status}
                              {a.status === "assistido" && a.detail?.startsWith("http") && (
                                <> · <a className="wa" href={a.detail} target="_blank" rel="noreferrer">wa.me ↗</a></>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
