import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, sessaoValida, senhaConfigurada } from "@/lib/auth";

// A parede. Tudo exige login, MENOS o que precisa ser público para a máquina
// funcionar:
//  - o webhook da Meta (ela chama sem cookie; já é autenticado pelo HMAC do
//    WHATSAPP_APP_SECRET);
//  - o cron da Vercel (chama sem cookie; protegido pelo CRON_SECRET);
//  - a política de privacidade (a Meta exige que seja pública para o app ficar
//    publicado — foi o que destravou o WhatsApp em agosto);
//  - a própria tela de login.
const PUBLICAS = [
  "/login",
  "/api/auth/login",
  "/privacidade",
  "/api/whatsapp/webhook",
  "/api/cron",
];

function ehPublica(path: string): boolean {
  return PUBLICAS.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (ehPublica(pathname)) return NextResponse.next();

  if (await sessaoValida(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  // API responde 401 em JSON; página redireciona para o login. Sem isso, um
  // fetch do painel receberia o HTML da tela de login e quebraria com um erro
  // de parse que não explica nada.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: senhaConfigurada() ? "não autenticado" : "APP_SENHA não configurada no servidor" },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?de=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

// Arquivos estáticos do Next não passam pela parede (não têm dado nenhum e
// bloqueá-los quebraria a própria tela de login).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
