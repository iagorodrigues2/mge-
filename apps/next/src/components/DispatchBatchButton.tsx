"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreviaLead { id: string; empresa: string; classe?: string; whatsapp: string | null; email: string | null; template: string | null }
interface Previa { elegiveis: number; noLote: number; restantes: number; templatesProntos: boolean | null; diagnosticoTemplates: string; leads: PreviaLead[] }
interface Resultado { empresa: string; ok: boolean; canal?: string; status?: string; detalhe?: string }

// Disparo do 1º contato para a fila inteira.
// SEMPRE em duas etapas: a prévia mostra quem receberia e por qual template, e
// só o segundo clique manda. Mensagem iniciada pela empresa é paga e disparo
// errado em volume é o que derruba a qualidade do número na Meta — um clique
// acidental não pode virar 12 mensagens.

// No modo assistido o "detalhe" é um link wa.me inteiro — despejar a URL
// codificada na tela não ajuda ninguém. Mostra o resumo e oferece o link.
function linkWaMe(detalhe?: string): string | null {
  const m = detalhe?.match(/https:\/\/wa\.me\/\S+/);
  return m ? m[0] : null;
}

function resumoDetalhe(detalhe: string): string {
  const semLink = detalhe.replace(/https:\/\/wa\.me\/\S+/, "").replace(/[—-]\s*$/, "").trim();
  return semLink.length > 140 ? `${semLink.slice(0, 140)}…` : semLink;
}

export default function DispatchBatchButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Começa com NENHUM marcado de propósito. São mensagens pagas e
  // irreversíveis: o certo é o envio exigir escolha consciente, não o
  // cancelamento exigir atenção.
  function alternar(id: string) {
    setEscolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function chamar(confirmar: boolean) {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/leads/dispatch-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar, limite: 15, ...(confirmar ? { ids: [...escolhidos] } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "falha no disparo");
      if (confirmar) {
        setResultados(d.resultados ?? []);
        setPrevia(null);
        router.refresh();
      } else {
        setPrevia(d as Previa);
        setEscolhidos(new Set());
        setResultados(null);
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button onClick={() => chamar(false)} disabled={loading}>
        {loading ? "Processando…" : "🚀 Disparar 1º contato (lote)"}
      </button>

      {erro && <div className="msg err" style={{ marginTop: 6 }}>✗ {erro}</div>}

      {previa && (
        <div className="panel" style={{ marginTop: 8, textAlign: "left", maxWidth: 460 }}>
          {previa.noLote === 0 ? (
            <p className="sub" style={{ margin: 0 }}>
              Nenhum lead elegível: precisa ser classe A ou B, ter WhatsApp ou e-mail, e ainda não ter recebido o primeiro contato.
            </p>
          ) : (
            <>
              <b>{previa.noLote} empresa(s) elegíveis</b>
              {previa.restantes > 0 && <div className="sub">+{previa.restantes} ficam para a próxima rodada</div>}
              <div className="sub" style={{ marginTop: 4 }}>
                Marque quem deve receber agora:{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); setEscolhidos(new Set(previa.leads.map((l) => l.id))); }}>todos</a>
                {" · "}
                <a href="#" onClick={(e) => { e.preventDefault(); setEscolhidos(new Set(previa.leads.filter((l) => l.classe === "TESTE").map((l) => l.id))); }}>só os de teste</a>
                {" · "}
                <a href="#" onClick={(e) => { e.preventDefault(); setEscolhidos(new Set()); }}>nenhum</a>
              </div>
              <ul style={{ margin: "8px 0", paddingLeft: 0, listStyle: "none" }}>
                {previa.leads.map((l) => (
                  <li key={l.id} style={{ marginBottom: 4 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                      <input type="checkbox" checked={escolhidos.has(l.id)} onChange={() => alternar(l.id)} style={{ marginTop: 3 }} />
                      <span>
                        {l.empresa}
                        <span className="sub"> ({l.classe}) · {l.whatsapp ?? l.email} · {l.template ?? "texto livre"}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {previa.templatesProntos === false && (
                <div className="msg err">✗ {previa.diagnosticoTemplates}</div>
              )}
              {previa.templatesProntos === null && (
                <div className="sub">{previa.diagnosticoTemplates}</div>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button onClick={() => chamar(true)} disabled={loading || previa.templatesProntos === false || escolhidos.size === 0}>
                  {escolhidos.size === 0 ? "Marque quem vai receber" : `Confirmar envio para ${escolhidos.size}`}
                </button>
                <button onClick={() => setPrevia(null)} disabled={loading}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {resultados && (
        <div className="panel" style={{ marginTop: 8, textAlign: "left", maxWidth: 460 }}>
          <b>{resultados.filter((r) => r.ok).length} enviado(s) · {resultados.filter((r) => !r.ok).length} falha(s)</b>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {resultados.map((r, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {r.ok ? "✓" : "✗"} {r.empresa}
                <div className="sub">
                  {r.status ?? "não enviado"}
                  {r.detalhe ? ` — ${resumoDetalhe(r.detalhe)}` : ""}
                  {linkWaMe(r.detalhe) && (
                    <>
                      {" "}
                      <a href={linkWaMe(r.detalhe)!} target="_blank" rel="noreferrer">abrir no WhatsApp →</a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
