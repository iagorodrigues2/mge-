"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; wa?: string } | null>(null);

  async function approve() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/leads/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const canais = (data.attempts ?? [])
          .map((a: { channel: string; status: string }) => `${a.channel}: ${a.status}`)
          .join(" · ");
        setMsg({ ok: true, text: `Aprovado e enviado (${canais})`, wa: data.waLink });
      } else {
        setMsg({ ok: false, text: `Bloqueado: ${(data.blocked ?? ["erro"]).join("; ")}` });
      }
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="primary" onClick={approve} disabled={loading || disabled}>
        {loading ? "Enviando…" : "✓ Aprovar e enviar"}
      </button>
      {msg && (
        <div className={`msg ${msg.ok ? "ok" : "err"}`}>
          {msg.text}
          {msg.wa && (
            <>
              {" "}
              <a className="wa" href={msg.wa} target="_blank" rel="noreferrer">abrir WhatsApp ↗</a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
