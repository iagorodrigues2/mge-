"use client";
import { useState } from "react";

interface Resultado {
  ok: boolean;
  backend?: string;
  modelo?: string;
  diagnostico?: string;
  mensagem?: string;
  erroOriginal?: string;
}

// Botão que testa a chave da IA contra o provedor e diz COMO RESOLVER.
// Existe para o Iago não depender de perguntar se a chave pegou.
export default function TestarIaButton() {
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<Resultado | null>(null);

  async function testar() {
    setLoading(true);
    setR(null);
    try {
      const res = await fetch("/api/ia/testar", { method: "POST" });
      setR(await res.json());
    } catch (e) {
      setR({ ok: false, mensagem: `Falha ao testar: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={testar} disabled={loading}>
        {loading ? "Testando…" : "🧪 Testar a chave da IA"}
      </button>
      {r && (
        <div
          style={{
            marginTop: 8, padding: "10px 12px", borderRadius: 8, fontSize: 13,
            border: `1px solid ${r.ok ? "#2e9e6b" : "var(--danger)"}`,
            background: r.ok ? "rgba(46,158,107,.10)" : "rgba(220,80,80,.10)",
          }}
        >
          <b>{r.ok ? "✅ IA funcionando" : "❌ IA não está funcionando"}</b>
          {r.ok && r.modelo && <span> · modelo {r.modelo}</span>}
          <div style={{ marginTop: 4 }}>{r.mensagem}</div>
          {r.erroOriginal && (
            <div className="hint" style={{ marginTop: 4, fontSize: 12 }}>
              erro do provedor: <code>{r.erroOriginal}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
