"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Qualifica os leads de busca em lotes, chamando a API em loop até esvaziar a
// fila (a função serverless processa poucos por vez p/ não estourar o tempo).
export default function QualifyButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    const acc = { processados: 0, aprovaveis: 0, nutrir: 0, naoAbordar: 0, erros: 0 };
    try {
      for (let i = 0; i < 30; i++) {
        const res = await fetch("/api/leads/qualify-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 8 }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || d.ok === false) throw new Error(d.error ?? "falha na qualificação");
        acc.processados += d.processados ?? 0;
        acc.aprovaveis += d.aprovaveis ?? 0;
        acc.nutrir += d.nutrir ?? 0;
        acc.naoAbordar += d.naoAbordar ?? 0;
        acc.erros += d.erros ?? 0;
        setMsg({ ok: true, text: `Qualificando… ${acc.processados} prontos · ${acc.aprovaveis} aprováveis` });
        router.refresh();
        if ((d.restantes ?? 0) === 0) break;
      }
      const parts = [
        `${acc.processados} qualificados`,
        `${acc.aprovaveis} aprováveis (A/B)`,
        acc.nutrir ? `${acc.nutrir} nutrir` : null,
        acc.naoAbordar ? `${acc.naoAbordar} fora do perfil` : null,
        acc.erros ? `${acc.erros} erro(s)` : null,
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
      <button className="primary" onClick={run} disabled={loading}>
        {loading ? "Qualificando…" : "🎯 Qualificar leads (perfil + marketplace)"}
      </button>
      {msg && <span className={`msg ${msg.ok ? "ok" : "err"}`} style={{ display: "block", marginTop: 6 }}>{msg.text}</span>}
    </span>
  );
}
