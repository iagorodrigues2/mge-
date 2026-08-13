"use client";
import { useState, useRef, useEffect } from "react";
import type { ConversationMsg, SdrAction } from "@/lib/types";

const ACTION_INFO: Record<SdrAction, { label: string; color: string }> = {
  continuar: { label: "conversando", color: "#6b7684" },
  agendar: { label: "📅 quer agendar", color: "#1f6feb" },
  handoff_fechamento: { label: "🔔 CHAMOU O IAGO (fechamento)", color: "#2e9e6b" },
  nao_interessado: { label: "nutrir / sem fit", color: "#d98e2b" },
  opt_out: { label: "opt-out", color: "#d64545" },
};

interface Turn {
  action?: SdrAction;
  motivo?: string;
}

export default function SdrChatPage() {
  const [empresa, setEmpresa] = useState("Estofados Bariloche");
  const [segmento, setSegmento] = useState("Móveis e estofados");
  const [msgs, setMsgs] = useState<ConversationMsg[]>([]);
  const [meta, setMeta] = useState<Record<number, Turn>>({}); // índice da msg da IA → decisão
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
        body: JSON.stringify({ empresa, segmento, message: text, history }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "A IA não respondeu (pode ser sobrecarga momentânea — tente de novo).");
        setLoading(false);
        return;
      }
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
    setMsgs([]); setMeta({}); setError(null); setInput("");
  }

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
