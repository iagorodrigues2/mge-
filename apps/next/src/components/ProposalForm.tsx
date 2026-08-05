"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Pkg { code: string; nome: string; precoRef: number; precoFundador?: number; destaque?: boolean; }

export default function ProposalForm({ leadId, packages }: { leadId: string; packages: Pkg[] }) {
  const router = useRouter();
  const initial = packages.find((p) => p.destaque) ?? packages[0];
  const [code, setCode] = useState(initial?.code ?? "");
  const [valor, setValor] = useState<number>(initial?.precoRef ?? 0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onSelect(c: string) {
    setCode(c);
    const p = packages.find((x) => x.code === c);
    if (p) setValor(p.precoRef);
  }

  async function create() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, packageCode: code, valor }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "falha");
      setMsg("✓ Proposta criada (rascunho). Veja em Propostas.");
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row">
      <div className="field" style={{ minWidth: 240 }}>
        <label>Oferta</label>
        <select value={code} onChange={(e) => onSelect(e.target.value)}>
          {packages.map((p) => (
            <option key={p.code} value={p.code}>{p.nome} {p.destaque ? "★" : ""}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ maxWidth: 150 }}>
        <label>Valor (R$)</label>
        <input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
      </div>
      <button className="primary" onClick={create} disabled={loading}>
        {loading ? "Criando…" : "Gerar proposta"}
      </button>
      {msg && <div className={`msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
    </div>
  );
}
