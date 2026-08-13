import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Máquina de Vendas — Iago Rodrigues",
  description: "CRM de prospecção e receita para consultoria de marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <header className="top">
          <span className="brand">🚀 Máquina de Vendas</span>
          <nav style={{ display: "flex", gap: 18 }}>
            <Link href="/">Command Center</Link>
            <Link href="/leads">Leads</Link>
            <Link href="/sdr-chat">💬 Testar IA</Link>
            <Link href="/propostas">Propostas</Link>
            <Link href="/financeiro">Financeiro</Link>
            <Link href="/configuracoes">Configurações</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
