"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Cadastro manual de lead. Existe porque todo lead com telefone dependia do
// minerador (que só acha número publicado em site) — e leads que você encontra
// na mão, num guia ou numa indicação, não tinham como entrar.
export default function NovoLeadForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ empresa: "", whatsapp: "", segmento: "", website: "", teste: true });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leads/novo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "não foi possível salvar");
      setMsg({ ok: true, texto: `${d.atualizado ? "Atualizado" : "Cadastrado"}: ${d.empresa} (${d.whatsapp})` });
      setF({ empresa: "", whatsapp: "", segmento: "", website: "", teste: f.teste });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, texto: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  if (!aberto) {
    return <button onClick={() => setAberto(true)}>➕ Cadastrar lead</button>;
  }

  return (
    <form onSubmit={salvar} className="panel" style={{ textAlign: "left", maxWidth: 420, marginTop: 8 }}>
      <b>Cadastrar lead</b>
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        <input placeholder="Empresa *" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} required />
        <input placeholder="WhatsApp * (11 98765-4321)" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
        <input placeholder="Segmento (ex: bolsas, atacado)" value={f.segmento} onChange={(e) => setF({ ...f, segmento: e.target.value })} />
        <input placeholder="Site (opcional)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
        <label className="hint" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={f.teste} onChange={(e) => setF({ ...f, teste: e.target.checked })} />
          É lead de teste (ignora o corte de score A/B e não conta como piloto)
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="submit" disabled={loading || !f.empresa}>{loading ? "Salvando…" : "Salvar"}</button>
        <button type="button" onClick={() => setAberto(false)} disabled={loading}>Fechar</button>
      </div>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`} style={{ marginTop: 8 }}>{msg.ok ? "✓" : "✗"} {msg.texto}</div>}
    </form>
  );
}
