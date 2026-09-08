"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResponderIagoForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [resposta, setResposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function enviar() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/responder-iago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resposta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error ?? data.envio?.detail ?? "falha no envio");
      setMsg({ ok: true, text: "✓ Enviado pro lead no WhatsApp." });
      setResposta("");
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `✗ ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        placeholder="Escreva a resposta — ela vai direto pro lead no WhatsApp, do jeito que você escrever aqui."
        rows={3}
        style={{
          width: "100%", font: "inherit", background: "var(--panel-2)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", resize: "vertical",
        }}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="primary" onClick={enviar} disabled={loading || !resposta.trim()}>
          {loading ? "Enviando…" : "Responder ao lead"}
        </button>
      </div>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </div>
  );
}
