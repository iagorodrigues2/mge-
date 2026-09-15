"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Importa o lote de leads mais recente embarcado no deploy (src/lotes/).
// Lead já existente é pulado, então clicar duas vezes não duplica nada.
export default function ImportarLoteButton({ lote, total }: { lote: string; total: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leads/import-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lote }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "falha ao importar");
      const parts = [
        `${d.created} novo(s)`,
        d.existentes?.length ? `${d.existentes.length} já existia(m)` : null,
        d.skipped?.length ? `${d.skipped.length} sem site` : null,
      ].filter(Boolean);
      setMsg({ ok: true, text: `✓ lote ${d.lote}: ${parts.join(" · ")} — agora Enriquecer → Qualificar` });
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
        {loading ? "Importando…" : `📥 Importar lote ${lote} (${total} leads)`}
      </button>
      {msg && <span className={`msg ${msg.ok ? "ok" : "err"}`} style={{ display: "block", marginTop: 6 }}>{msg.text}</span>}
    </span>
  );
}
