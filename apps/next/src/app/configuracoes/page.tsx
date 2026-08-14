import { listPackages, activeBackend } from "@/lib/db";
import { activeLlm } from "@/lib/llm";
import PriceEditor from "@/components/PriceEditor";
import TestarIaButton from "@/components/TestarIaButton";

export const dynamic = "force-dynamic";

function Status({ on, label, hint }: { on: boolean; label: string; hint: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <b>{label}</b>
        <div className="hint">{hint}</div>
      </div>
      <span className={`badge ${on ? "A" : "NAO_ABORDAR"}`}>{on ? "LIGADO" : "modo demo"}</span>
    </div>
  );
}

export default async function ConfiguracoesPage() {
  const packages = await listPackages();
  const env = process.env;
  const searchOn = Boolean(env.SERPER_API_KEY || env.BRAVE_API_KEY);
  const waOn = Boolean(env.WHATSAPP_BUSINESS_TOKEN && env.WHATSAPP_BUSINESS_PHONE_ID);
  const emailOn = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  const backend = activeBackend();
  const llm = activeLlm();
  const iaOn = llm !== "none";

  return (
    <main>
      <h1>Configurações</h1>
      <p className="sub">Integrações e preços. Nada de preço no código — os valores abaixo vivem no banco e valem para as propostas.</p>

      <h2>Integrações</h2>
      <div className="panel">
        <Status on={backend === "postgres"} label={`Banco de dados: ${backend === "postgres" ? "Postgres" : "JSON local (dev)"}`}
          hint="Defina DATABASE_URL (Neon/Supabase/Vercel Postgres) para usar Postgres. Sem isso, roda em arquivo JSON — ok no dev, mas NÃO no Vercel (filesystem efêmero)." />
        <Status on={searchOn} label="Busca real de leads na internet"
          hint="Defina SERPER_API_KEY (serper.dev) ou BRAVE_API_KEY no .env.local. Sem chave, o Scout gera leads fictícios." />
        <Status on={waOn} label="WhatsApp automático (Cloud API)"
          hint="Defina WHATSAPP_BUSINESS_TOKEN + WHATSAPP_BUSINESS_PHONE_ID. Sem isso, a aprovação gera link wa.me (envio assistido)." />
        <Status on={emailOn} label="E-mail (SMTP)"
          hint="Defina SMTP_HOST/PORT/USER/PASS/FROM. Sem isso, o e-mail vira rascunho." />
        <Status on={iaOn} label={`Cérebro da IA (agente Vendedor)${iaOn ? ` — ${llm}` : ""}`}
          hint="Defina ANTHROPIC_API_KEY (e ANTHROPIC_MODEL) nas variáveis de ambiente. Sem isso o agente Vendedor não conversa. Presença da chave ≠ chave válida: use o teste abaixo." />
        <TestarIaButton />
        <p className="hint" style={{ marginTop: 12 }}>
          Na Vercel, variável nova só vale <b>depois do Redeploy</b> (Deployments → ⋯ → Redeploy).
          No local, reinicie o servidor após editar o <code>.env.local</code>.
        </p>
      </div>

      <h2>Preços dos pacotes (seção 3)</h2>
      <div className="panel">
        {packages.map((p) => <PriceEditor key={p.code} pkg={p} />)}
        <p className="hint">Regra: a proposta do Programa Anual deve sempre mostrar o preço de tabela ao lado da condição fundador. Sem falsa urgência.</p>
      </div>
    </main>
  );
}
