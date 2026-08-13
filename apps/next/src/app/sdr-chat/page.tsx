"use client";
import { useState, useRef, useEffect } from "react";
import type { ConversationMsg, SdrAction, SdrPhase, SdrState } from "@/lib/types";

const ACTION_INFO: Record<SdrAction, { label: string; color: string }> = {
  continuar: { label: "conversando", color: "#6b7684" },
  agendar: { label: "📅 quer agendar", color: "#1f6feb" },
  handoff_fechamento: { label: "🔔 CHAMOU O IAGO (fechamento)", color: "#2e9e6b" },
  sem_fit: { label: "🚫 sem fit — não recomendou vender", color: "#8a6bd9" },
  nao_interessado: { label: "lead recusou → nutrir", color: "#d98e2b" },
  opt_out: { label: "opt-out", color: "#d64545" },
};

// A fase é calculada pela máquina, não pela IA — mostrar isso é o ponto: dá pra
// ver que a oferta só aparece depois do diagnóstico e da conta.
// Fluxo do chat (Correção §14). O diagnóstico profundo é da REUNIÃO.
const FASES: { key: SdrPhase; label: string }[] = [
  { key: "abertura", label: "abertura" },
  { key: "motivo", label: "motivo" },
  { key: "dor", label: "dor principal" },
  { key: "contexto", label: "contexto" },
  { key: "percepcao", label: "percepção útil" },
  { key: "fit", label: "prioridade / fit" },
  { key: "proximo_passo", label: "próximo passo" },
];

// As 4 camadas que o chat persegue.
const SLOT_LABEL: Record<string, string> = {
  motivo: "Motivo do contato", problema: "Dor principal",
  situacao: "Contexto", prioridade: "Prioridade", volume: "Volume de compra",
};

// Só aparecem se o lead falar por conta própria — não se persegue no chat.
const SLOT_REUNIAO: Record<string, string> = {
  causa: "Causa", impacto: "Impacto (R$)", capacidade: "Capacidade",
  decisao: "Decisão", criterio: "Critério",
};

interface Turn {
  action?: SdrAction;
  motivo?: string;
}

// Espelha `podeAgendar` do servidor só para o indicador da tela (§16).
function podeAgendarUI(s: SdrState | null): boolean {
  if (!s) return false;
  const sig = s.signals ?? {};
  const problemaReal = s.discovery?.problema?.status === "confirmado" || sig.problemaReal === true;
  const vontade = s.discovery?.prioridade?.status !== "desconhecido" || sig.vontadeResolver === true;
  const volumeOk = s.discovery?.volume?.status !== "desconhecido" || (!!sig.faixaVolume && sig.faixaVolume !== "desconhecida");
  return problemaReal && vontade && volumeOk && sig.aderencia !== false
    && sig.possibilidadeContratacao !== false && !!s.percepcaoEntregue;
}

const FAIXA_LABEL: Record<string, string> = {
  ate_20k: "até R$20 mil/mês", "20k_50k": "R$20-50 mil/mês",
  "50k_100k": "R$50-100 mil/mês", acima_100k: "acima de R$100 mil/mês",
};

export default function SdrChatPage() {
  const [empresa, setEmpresa] = useState("Estofados Bariloche");
  const [segmento, setSegmento] = useState("Móveis e estofados");
  const [msgs, setMsgs] = useState<ConversationMsg[]>([]);
  const [meta, setMeta] = useState<Record<number, Turn>>({}); // índice da msg da IA → decisão
  const [state, setState] = useState<SdrState | null>(null); // estado do diagnóstico
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const now = new Date().toISOString();
    const history = msgs;
    const withLead: ConversationMsg[] = [...history, { role: "lead", text, at: now }];
    setMsgs(withLead);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/sdr/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, segmento, message: text, history, state }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "A IA não respondeu (pode ser sobrecarga momentânea — tente de novo).");
        setLoading(false);
        return;
      }
      if (data.state) setState(data.state);
      const iaMsg: ConversationMsg = { role: "ia", text: data.reply, at: new Date().toISOString() };
      setMsgs((prev) => {
        const next = [...prev, iaMsg];
        setMeta((m) => ({ ...m, [next.length - 1]: { action: data.action, motivo: data.motivo } }));
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  function reset() {
    setMsgs([]); setMeta({}); setError(null); setInput(""); setState(null);
  }

  const faseAtual = state?.phase ?? "abertura";
  const faseIdx = FASES.findIndex((f) => f.key === faseAtual);
  const bc = state?.businessCase;

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ margin: "0 0 4px" }}>💬 Testar a IA Vendedora</h1>
      <p className="sub">Digite como se você fosse o <b>lead</b>. A IA responde sozinha e mostra a decisão dela do lado (é uma simulação — não envia WhatsApp nem salva nada).</p>

      <div className="card" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          <span className="hint">Empresa do lead</span>
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} style={inp} />
        </label>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          <span className="hint">Segmento</span>
          <input value={segmento} onChange={(e) => setSegmento(e.target.value)} style={inp} />
        </label>
        <button className="btn ghost" onClick={reset}>Limpar conversa</button>
      </div>

      {/* Painel do raciocínio: a oferta só destrava depois do diagnóstico + conta. */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {FASES.map((f, i) => (
            <span key={f.key} className="badge" style={{
              background: i < faseIdx ? "#2e9e6b" : i === faseIdx ? "var(--accent-2)" : "var(--panel-2)",
              color: i <= faseIdx ? "#fff" : "var(--muted)",
              border: "1px solid var(--border)",
            }}>{i + 1}. {f.label}</span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
          {Object.entries(SLOT_LABEL).map(([slot, label]) => {
            const f = state?.discovery?.[slot as keyof typeof state.discovery];
            const st = f?.status ?? "desconhecido";
            const cor = st === "confirmado" ? "#2e9e6b" : st === "hipotese" ? "#d98e2b" : "var(--muted)";
            return (
              <div key={slot} style={{ borderLeft: `3px solid ${cor}`, paddingLeft: 8 }}>
                <div style={{ fontSize: 12, color: cor, fontWeight: 600 }}>
                  {st === "confirmado" ? "✔" : st === "hipotese" ? "~" : "✗"} {label}
                </div>
                <div className="hint" style={{ fontSize: 12 }}>{f?.valor || "—"}</div>
              </div>
            );
          })}
        </div>

        {/* Orçamento de perguntas: o chat não é a consultoria (Correção §3/§7/§9) */}
        <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ color: (state?.perguntasFeitas ?? 0) > 6 ? "var(--danger)" : "var(--muted)" }}>
            ❓ perguntas: <b>{state?.perguntasFeitas ?? 0}</b>/6
          </span>
          <span style={{ color: state?.percepcaoEntregue ? "#2e9e6b" : "#d98e2b" }}>
            💡 percepção útil: <b>{state?.percepcaoEntregue ? "entregue" : "ainda não"}</b>
          </span>
          <span style={{ color: podeAgendarUI(state) ? "#2e9e6b" : "var(--muted)" }}>
            📅 pronto p/ reunião: <b>{podeAgendarUI(state) ? "sim" : "ainda não"}</b>
          </span>
          {state?.fadigaDetectada && <span style={{ color: "var(--danger)" }}>⚠ lead cansou — ir direto ao ponto</span>}
        </div>

        {/* O que o lead entregou de graça — não perseguimos isso no chat */}
        {state && Object.entries(SLOT_REUNIAO).some(([s]) => state.discovery?.[s as keyof typeof state.discovery]?.status !== "desconhecido") && (
          <div className="hint" style={{ marginTop: 8, fontSize: 12 }}>
            🗓 o lead contou espontaneamente (fica pra reunião):{" "}
            {Object.entries(SLOT_REUNIAO)
              .filter(([s]) => state.discovery?.[s as keyof typeof state.discovery]?.status !== "desconhecido")
              .map(([, l]) => l).join(", ")}
          </div>
        )}

        {bc && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "var(--panel-2)", borderRadius: 8, fontSize: 13 }}>
            🧮 <b>Conta (§15):</b> R$ {bc.valorProjeto.toLocaleString("pt-BR")} ÷ {bc.mesesPayback} meses ={" "}
            precisa gerar/preservar <b>R$ {bc.ganhoMensalNecessario.toLocaleString("pt-BR")}/mês</b>
            {bc.impactoMensalEstimado != null && (
              <> · impacto apurado: R$ {bc.impactoMensalEstimado.toLocaleString("pt-BR")}/mês →{" "}
                <b style={{ color: bc.viavel ? "#2e9e6b" : "var(--danger)" }}>{bc.viavel ? "a conta fecha" : "a conta NÃO fecha"}</b>
              </>
            )}
          </div>
        )}

        {/* Score = probabilidade e qualidade da oportunidade, não campos preenchidos */}
        {state?.score && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "var(--panel-2)", borderRadius: 8, fontSize: 13 }}>
            <b style={{ color: state.score.total >= 45 ? "#2e9e6b" : state.score.total >= 30 ? "#d98e2b" : "var(--muted)" }}>
              🌡 Score comercial {state.score.total}/70{state.score.provisorio ? " (provisório)" : ""}
            </b>
            <div className="hint" style={{ fontSize: 12, marginTop: 4 }}>
              fit {state.score.fit} · dor {state.score.dor} · impacto {state.score.impacto} · urgência {state.score.urgencia}
              {" "}· autoridade {state.score.autoridade} · capacidade {state.score.capacidade} · confiança {state.score.confianca}
            </div>
            {!!state.score.aConfirmar?.length && (
              <div className="hint" style={{ fontSize: 12 }}>a confirmar: {state.score.aConfirmar.join(", ")}</div>
            )}
            {state.signals?.faixaVolume && state.signals.faixaVolume !== "desconhecida" && (
              <div className="hint" style={{ fontSize: 12 }}>📦 volume: {FAIXA_LABEL[state.signals.faixaVolume]}</div>
            )}
          </div>
        )}

        {!!state?.sinaisIntencao?.length && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(46,158,107,.12)", border: "1px solid #2e9e6b", borderRadius: 8, fontSize: 13 }}>
            ⚡ <b>{state.sinaisIntencao.join(" · ")}</b>
            {state.prioridadeAgenda === "alta" && " — prioridade alta na agenda"}
          </div>
        )}

        <div className="hint" style={{ marginTop: 10, fontSize: 12 }}>
          {state?.ofertaRecomendada
            ? <>🎯 <b>Oferta liberada:</b> {state.ofertaRecomendada} — {state.ofertaMotivo}</>
            : <>🔒 <b>Oferta e preço bloqueados</b> — {state?.ofertaMotivo || "o diagnóstico ainda não está pronto"}</>}
          {!!state?.riscos?.length && <> · ⚠ risco: {state.riscos.join("; ")}</>}
        </div>
      </div>

      <div className="card" style={{ minHeight: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.length === 0 && <p className="hint" style={{ textAlign: "center", margin: "auto" }}>Comece digitando uma mensagem como o lead — ex: "Quem é?" ou "Recebi sua mensagem, do que se trata?"</p>}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "lead" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "78%" }}>
              <div style={{
                background: m.role === "lead" ? "var(--accent-2)" : "var(--panel-2)",
                color: m.role === "lead" ? "#fff" : "var(--text)",
                border: "1px solid var(--border)", borderRadius: 12,
                padding: "9px 13px", whiteSpace: "pre-wrap",
              }}>{m.text}</div>
              {m.role === "ia" && meta[i]?.action && (
                <div style={{ marginTop: 5 }}>
                  <span className="badge" style={{ background: ACTION_INFO[meta[i].action!].color, color: "#04140c" }}>
                    {ACTION_INFO[meta[i].action!].label}
                  </span>
                  {meta[i]?.motivo && <span className="hint" style={{ marginLeft: 8 }}>🧠 {meta[i].motivo}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="hint" style={{ fontStyle: "italic" }}>A IA está pensando…</div>}
        {error && <div className="err" style={{ color: "var(--danger)" }}>⚠ {error}</div>}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escreva como o lead…  (Enter envia)"
          style={{ ...inp, flex: 1 }}
        />
        <button className="btn primary" onClick={send} disabled={loading}>{loading ? "…" : "Enviar"}</button>
      </div>
    </main>
  );
}

const inp: React.CSSProperties = {
  font: "inherit", background: "var(--panel-2)", color: "var(--text)",
  border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px",
};
