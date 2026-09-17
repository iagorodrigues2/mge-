"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Parada { id: string; empresa: string; teste: boolean; quando: string; ultimaMsg: string; modo: "ia" | "template"; template: string | null }
interface Resultado { empresa: string; modo: string; ok: boolean; detalhe?: string }

// Conversas em que o lead falou e a IA não respondeu (crédito zerado, API
// fora). Prévia primeiro; o segundo clique retoma: texto livre se a janela de
// 24h está aberta, template de retomada se fechou.
export default function RetomarIaButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previa, setPrevia] = useState<Parada[] | null>(null);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function alternar(id: string) {
    setEscolhidos((atual) => { const n = new Set(atual); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function chamar(confirmar: boolean) {
    setLoading(true); setErro(null);
    try {
      const res = await fetch("/api/leads/retomar-ia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar, ...(confirmar ? { ids: [...escolhidos] } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "falha na retomada");
      if (confirmar) { setResultados(d.resultados ?? []); setPrevia(null); router.refresh(); }
      else { setPrevia(d.leads ?? []); setEscolhidos(new Set((d.leads ?? []).filter((l: Parada) => !l.teste).map((l: Parada) => l.id))); }
    } catch (e) {
      setErro(`✗ ${(e as Error).message}`);
    } finally { setLoading(false); }
  }

  const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <span>
      <button onClick={() => chamar(false)} disabled={loading}>{loading && !previa ? "Procurando…" : "🩹 Retomar conversas paradas"}</button>
      {erro && <span className="msg err" style={{ display: "block", marginTop: 6 }}>{erro}</span>}

      {previa && (
        <div className="panel" style={{ marginTop: 10, textAlign: "left", maxWidth: 620 }}>
          <b>{previa.length} conversa(s) parada(s)</b>
          {previa.length === 0 && <p className="hint" style={{ margin: "6px 0 0" }}>Nenhum lead esperando resposta da IA.</p>}
          {previa.map((p) => (
            <label key={p.id} style={{ display: "block", padding: "6px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
              <input type="checkbox" checked={escolhidos.has(p.id)} onChange={() => alternar(p.id)} />{" "}
              <b>{p.empresa}</b>{p.teste ? " (teste)" : ""} <span className="hint">· {quando(p.quando)} · {p.modo === "ia" ? "Rafael responde agora" : `template ${p.template ?? "?"}`}</span>
              <div className="sub" style={{ margin: "2px 0 0 22px" }}>lead: {p.ultimaMsg}</div>
            </label>
          ))}
          {previa.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="primary" onClick={() => chamar(true)} disabled={loading || escolhidos.size === 0}>
                {loading ? "Retomando…" : `Retomar ${escolhidos.size} conversa(s)`}
              </button>
              <button onClick={() => setPrevia(null)} disabled={loading}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {resultados && (
        <div className="panel" style={{ marginTop: 10, textAlign: "left", maxWidth: 620 }}>
          <b>{resultados.filter((r) => r.ok).length} de {resultados.length} retomada(s)</b>
          {resultados.map((r, i) => (
            <div key={i} className="sub" style={{ margin: "4px 0" }}>{r.ok ? "✓" : "✗"} {r.empresa} · {r.modo}{r.detalhe ? ` · ${r.detalhe.slice(0, 120)}` : ""}</div>
          ))}
        </div>
      )}
    </span>
  );
}
