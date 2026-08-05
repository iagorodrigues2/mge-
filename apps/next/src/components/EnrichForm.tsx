"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Formata o CNPJ enquanto digita: 00.000.000/0000-00
function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function EnrichForm({ leadId, initialCnpj }: { leadId: string; initialCnpj?: string }) {
  const router = useRouter();
  const [cnpj, setCnpj] = useState(initialCnpj ? maskCnpj(initialCnpj) : "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error ?? "falha no enriquecimento");
      const nome = data.lead?.razao_social ?? data.lead?.empresa ?? "empresa";
      setMsg({
        ok: data.ativa !== false,
        text: data.ativa === false
          ? `⚠ ${nome} — situação "${data.situacao}". Marcado como "não abordar".`
          : `✓ ${nome} confirmada na Receita (${data.situacao}).`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `✗ ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="row">
        <div className="field" style={{ minWidth: 220 }}>
          <label>CNPJ</label>
          <input
            value={cnpj}
            onChange={(e) => setCnpj(maskCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
          />
        </div>
        <button className="primary" onClick={run} disabled={loading || cnpj.replace(/\D/g, "").length !== 14}>
          {loading ? "Consultando…" : "🏛 Enriquecer na Receita"}
        </button>
      </div>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <p className="hint" style={{ marginTop: 10 }}>
        Consulta a BrasilAPI (Receita Federal) — grátis, sem chave. Confirma razão social, CNAE, porte,
        situação cadastral, data de abertura e contato público, e recalcula o score.
      </p>
    </div>
  );
}
