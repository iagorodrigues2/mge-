import { listPackages, activeBackend } from "@/lib/db";
import PriceEditor from "@/components/PriceEditor";

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
        <p className="hint" style={{ marginTop: 12 }}>
          Depois de editar o <code>.env.local</code>, reinicie o servidor para as chaves entrarem em vigor.
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
