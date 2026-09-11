import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import SairButton from "@/components/SairButton";
import { COOKIE, sessaoValida } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Máquina de Vendas — Iago Rodrigues",
  description: "CRM de prospecção e receita para consultoria de marketplace",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fora da sessão (tela de login, política de privacidade) o menu não aparece:
  // são links para páginas que a parede vai bloquear de qualquer jeito.
  const logado = await sessaoValida((await cookies()).get(COOKIE)?.value);
  // Página de cliente (/diagnostico, vinda da bio do Instagram): sem cabeçalho.
  // A marca "Máquina de Vendas" é do operador, não do lead.
  const paginaCliente = (await headers()).get("x-pagina-cliente") === "1";

  return (
    <html lang="pt-br">
      <body>
        {!paginaCliente && <header className="top">
          <span className="brand">🚀 Máquina de Vendas</span>
          {logado && (
            <nav style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <Link href="/">Command Center</Link>
              <Link href="/leads">Leads</Link>
              <Link href="/metricas">📊 Métricas</Link>
              <Link href="/sdr-chat">💬 Testar IA</Link>
              <Link href="/propostas">Propostas</Link>
              <Link href="/financeiro">Financeiro</Link>
              <Link href="/configuracoes">Configurações</Link>
              <SairButton />
            </nav>
          )}
        </header>}
        {children}
      </body>
    </html>
  );
}
