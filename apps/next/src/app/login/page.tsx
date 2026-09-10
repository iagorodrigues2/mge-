import LoginForm from "@/components/LoginForm";
import { senhaConfigurada } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de } = await searchParams;
  const pronta = senhaConfigurada();

  return (
    <main style={{ maxWidth: 380, margin: "12vh auto" }}>
      <h1 style={{ marginBottom: 4 }}>🚀 Máquina de Vendas</h1>
      <p className="sub" style={{ marginTop: 0 }}>Painel restrito.</p>

      {pronta ? (
        <LoginForm destino={de ?? "/"} />
      ) : (
        <div className="panel">
          <b>Falta configurar a senha no servidor.</b>
          <p className="hint" style={{ marginTop: 8 }}>
            Defina a variável <code>APP_SENHA</code> (mínimo 8 caracteres) no projeto da Vercel
            (Settings → Environment Variables → Production) e faça <b>Redeploy</b> em
            Deployments → ⋯ → Redeploy. Enquanto ela não existir, ninguém entra —
            inclusive você. O robô do WhatsApp continua funcionando normalmente.
          </p>
        </div>
      )}
    </main>
  );
}
