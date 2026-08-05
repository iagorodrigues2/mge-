"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SEGMENTOS = [
  "Casa, móveis e decoração",
  "Cama, mesa e banho",
  "Moda, vestuário e calçados",
  "Esporte, fitness e lazer",
  "Beleza e cuidados pessoais",
  "Pet",
  "Ferramentas e utilidades",
];

export default function ScoutForm() {
  const router = useRouter();
  const [segmento, setSegmento] = useState(SEGMENTOS[0]);
  const [regiao, setRegiao] = useState("");
  const [quantidade, setQuantidade] = useState(8);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmento, regiao, quantidade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha na busca");
      const modo = data.mode === "busca" ? "busca real na internet" : "gerador (fictício — configure SERPER_API_KEY para busca real)";
      setMsg(`✓ ${data.count} leads pesquisados e pontuados via ${modo}.`);
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Buscar leads por nicho</h2>
      <div className="row">
        <div className="field" style={{ minWidth: 240 }}>
          <label>Segmento</label>
          <select value={segmento} onChange={(e) => setSegmento(e.target.value)}>
            {SEGMENTOS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Região (opcional)</label>
          <input value={regiao} onChange={(e) => setRegiao(e.target.value)} placeholder="ex.: Curitiba/PR" />
        </div>
        <div className="field" style={{ maxWidth: 110 }}>
          <label>Quantidade</label>
          <input type="number" min={1} max={30} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
        </div>
        <button className="primary" onClick={run} disabled={loading}>
          {loading ? "Buscando…" : "🔍 Buscar e pontuar"}
        </button>
      </div>
      {msg && <div className={`msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
      <p className="hint" style={{ marginTop: 12 }}>
        O Scout pesquisa empresas do nicho, calcula o score (0–100) e classifica em A/B/Nutrir/Não abordar.
        Só leads A e B entram para aprovação.
      </p>
    </div>
  );
}
