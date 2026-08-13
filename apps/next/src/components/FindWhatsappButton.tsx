"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Minera o WhatsApp comercial do site das empresas — o gargalo do outbound.
// Roda em lotes por causa do limite de 60s da Vercel; o botão continua sozinho
// até acabar a fila, mostrando o que já achou.
export default function FindWhatsappButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    let encontrados = 0;
    let verificados = 0;
    try {
      // segue chamando enquanto houver fila (cada chamada = 1 lote curto)
      for (let volta = 0; volta < 40; volta++) {
        const res = await fetch("/api/leads/find-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limite: 8 }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || d.ok === false) throw new Error(d.error ?? "falha no lote");
        encontrados += d.encontrados ?? 0;
        verificados += d.verificados ?? 0;
        setMsg({ ok: true, text: `📱 ${encontrados} WhatsApp em ${verificados} sites… (faltam ${d.restantes})` });
        if (!d.restantes || !d.verificados) break;
      }
      setMsg({
        ok: true,
        text: `✓ ${encontrados} WhatsApp encontrado(s) em ${verificados} site(s) verificado(s)`,
      });
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
        {loading ? "Procurando…" : "📱 Achar WhatsApp (lote)"}
      </button>
      {msg && <span className={`msg ${msg.ok ? "ok" : "err"}`} style={{ display: "block", marginTop: 6 }}>{msg.text}</span>}
    </span>
  );
}
