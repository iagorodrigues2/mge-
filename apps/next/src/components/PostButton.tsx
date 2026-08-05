"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  url: string;
  method?: "POST" | "PATCH";
  body?: Record<string, unknown>;
  label: string;
  className?: string;
  confirm?: string;
  successText?: string; // mensagem fixa opcional
}

// Deriva a mensagem de sucesso dos campos conhecidos da resposta (sem passar
// funções de Server -> Client Components, o que o Next proíbe).
function describe(data: any, fallback?: string): string {
  if (fallback) return fallback;
  if (typeof data?.processed === "number") return `Processados: ${data.processed}`;
  if (Array.isArray(data?.attempts) && data.attempts.length) {
    return "Enviado (" + data.attempts.map((a: any) => `${a.channel}:${a.status}`).join(" · ") + ")";
  }
  if (data?.stage) return `Estágio: ${data.stage}`;
  if (data?.deal?.status) return `Negócio: ${data.deal.status}`;
  return "Feito ✓";
}

export default function PostButton({ url, method = "POST", body, label, className = "", confirm, successText }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data.ok !== false;
      const blocked = data.blocked ?? (data.error ? [data.error] : ["erro"]);
      setMsg({ ok, text: ok ? describe(data, successText) : `Bloqueado: ${Array.isArray(blocked) ? blocked.join("; ") : blocked}` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button className={className} onClick={run} disabled={loading}>
        {loading ? "…" : label}
      </button>
      {msg && <span className={`msg ${msg.ok ? "ok" : "err"}`} style={{ display: "block" }}>{msg.text}</span>}
    </span>
  );
}
