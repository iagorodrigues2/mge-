"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ destino }: { destino: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "não foi possível entrar");
      // replace (e não push) para o botão "voltar" não cair na tela de login.
      router.replace(destino.startsWith("/") ? destino : "/");
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={entrar} className="panel">
      <label htmlFor="senha"><b>Senha</b></label>
      <input
        id="senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoFocus
        autoComplete="current-password"
        style={{ width: "100%", margin: "8px 0" }}
      />
      <button type="submit" disabled={loading || !senha}>{loading ? "Entrando…" : "Entrar"}</button>
      {erro && <div className="msg err" style={{ marginTop: 8 }}>✗ {erro}</div>}
      <p className="hint" style={{ marginTop: 12 }}>A sessão dura 30 dias neste navegador.</p>
    </form>
  );
}
