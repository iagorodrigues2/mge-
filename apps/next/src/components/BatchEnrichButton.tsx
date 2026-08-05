"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BatchEnrichButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leads/enrich-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "falha no lote");
      const parts = [
        `${d.enriquecidos} enriquecido(s)`,
        d.naoAtiva ? `${d.naoAtiva} inativo(s)→não abordar` : null,
        d.semCnpj ? `${d.semCnpj} sem CNPJ` : null,
        d.jaEnriquecidos ? `${d.jaEnriquecidos} já feitos` : null,
        d.erros ? `${d.erros} erro(s)` : null,
      ].filter(Boolean);
      setMsg({ ok: true, text: `✓ ${parts.join(" · ")}` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `✗ ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button onClick={run} disabled={loading}>
        {loading ? "Enriquecendo…" : "🏛 Enriquecer leads (lote)"}
      </button>
      {msg && <span className={`msg ${msg.ok ? "ok" : "err"}`} style={{ display: "block", marginTop: 6 }}>{msg.text}</span>}
    </span>
  );
}
