"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Pkg { code: string; nome: string; precoRef: number; precoFundador?: number; ativo: boolean; }

export default function PriceEditor({ pkg }: { pkg: Pkg }) {
  const router = useRouter();
  const [precoRef, setPrecoRef] = useState(pkg.precoRef);
  const [precoFundador, setPrecoFundador] = useState(pkg.precoFundador ?? 0);
  const [ativo, setAtivo] = useState(pkg.ativo);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pkg.code, precoRef, precoFundador: precoFundador || null, ativo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "falha");
      setMsg("✓ salvo");
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ alignItems: "flex-end", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
      <div className="field" style={{ minWidth: 220 }}>
        <label>{pkg.nome}</label>
        <span className="hint">{pkg.code}</span>
      </div>
      <div className="field" style={{ maxWidth: 140 }}>
        <label>Preço ref. (R$)</label>
        <input type="number" value={precoRef} onChange={(e) => setPrecoRef(Number(e.target.value))} />
      </div>
      <div className="field" style={{ maxWidth: 150 }}>
        <label>Fundador (R$)</label>
        <input type="number" value={precoFundador} onChange={(e) => setPrecoFundador(Number(e.target.value))} />
      </div>
      <label className="field" style={{ maxWidth: 90 }}>
        <span>Ativo</span>
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} style={{ width: 20, height: 20 }} />
      </label>
      <button className="primary" onClick={save} disabled={busy}>Salvar</button>
      {msg && <span className={`msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</span>}
    </div>
  );
}
