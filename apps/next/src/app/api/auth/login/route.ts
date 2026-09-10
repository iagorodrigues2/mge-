import { NextResponse } from "next/server";
import { COOKIE, criarSessao, senhaConfigurada, senhaCorreta } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { senha?: string };

  if (!senhaConfigurada()) {
    return NextResponse.json(
      { ok: false, error: "APP_SENHA não está configurada no servidor (mínimo 8 caracteres). Defina na Vercel e faça Redeploy." },
      { status: 503 },
    );
  }

  // Atraso fixo em toda tentativa: sem estado compartilhado entre as funções
  // serverless não dá pra contar tentativas de verdade, mas 400ms já tira a
  // graça de tentar senha em volume.
  await new Promise((r) => setTimeout(r, 400));

  if (!senhaCorreta(body.senha ?? "")) {
    return NextResponse.json({ ok: false, error: "senha incorreta" }, { status: 401 });
  }

  const sessao = await criarSessao();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessao.valor, {
    httpOnly: true, // JS da página não lê o cookie
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessao.maxAge,
  });
  return res;
}
