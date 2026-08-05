"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProposalActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: "send" | "accept" | "lose") {
    let reason: string | undefined;
    if (action === "lose") {
      reason = window.prompt("Motivo da perda?") ?? undefined;
      if (reason == null) return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "falha");
      setMsg(action === "accept" ? "✓ Aceita — negócio criado no Financeiro" : "✓ ok");
      router.refresh();
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      {status === "rascunho" && <button onClick={() => act("send")} disabled={busy}>Enviar</button>}
      {(status === "rascunho" || status === "enviada") && (
        <>
          <button className="primary" onClick={() => act("accept")} disabled={busy}>Marcar aceita</button>
          <button className="ghost" onClick={() => act("lose")} disabled={busy}>Perdida</button>
        </>
      )}
      {msg && <span className={`msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</span>}
    </div>
  );
}
