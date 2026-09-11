import Link from "next/link";
import { listLeads } from "@/lib/db";
import { calcularMetricas, pct } from "@/lib/metricas";
import { dataHora } from "@/lib/datas";

export const dynamic = "force-dynamic";

const PERIODOS = [
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 0, label: "tudo" },
];

function Numero({ valor, label, hint }: { valor: string | number; label: string; hint?: string }) {
  return (
    <div className="panel" style={{ flex: "1 1 150px", minWidth: 150 }}>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{valor}</div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{label}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export default async function MetricasPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  const periodo = dias === "0" ? null : Number(dias ?? 30);
  const m = calcularMetricas(await listLeads(), periodo);

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Métricas</h1>
          <p className="sub" style={{ marginTop: 0 }}>
            Leads de teste ficam fora dos números — aparecem separados no rodapé.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {PERIODOS.map((p) => (
            <Link key={p.dias} href={`/metricas?dias=${p.dias}`}
              className={String(periodo ?? 0) === String(p.dias) ? "badge A" : "badge"}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <h2>O funil</h2>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
        <Numero valor={m.total.contatados} label="Contatados" hint="1º contato que saiu de verdade" />
        <Numero valor={m.total.responderam} label="Responderam" hint={`taxa de resposta ${pct(m.total.taxaResposta)}`} />
        <Numero valor={m.total.emConversa} label="Em conversa" hint="Rafael conduzindo agora" />
        <Numero valor={m.total.reunioes} label="Reuniões" hint={`${pct(m.total.taxaReuniao)} de quem respondeu`} />
        <Numero valor={m.total.ganhos} label="Ganhos" hint="contrato fechado e pago" />
      </div>

      {m.total.contatados === 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          Nenhum contato real no período. Os números só ganham sentido depois do primeiro lote —
          e com menos de 20 contatos qualquer taxa aqui é ruído, não tendência.
        </div>
      )}

      <h2>Por origem</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        É aqui que se compara canal com canal — qual traz lead que responde, não qual traz mais lead.
      </p>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Origem</th><th>Contatados</th><th>Responderam</th><th>Taxa</th>
              <th>Reuniões</th><th>Opt-out</th><th>Sem fit</th>
            </tr>
          </thead>
          <tbody>
            {m.porOrigem.length === 0 && <tr><td colSpan={7} className="hint">sem dados no período</td></tr>}
            {m.porOrigem.map((f) => (
              <tr key={f.origem}>
                <td><b>{f.origem}</b></td>
                <td>{f.contatados}</td>
                <td>{f.responderam}</td>
                <td>{pct(f.taxaResposta)}</td>
                <td>{f.reunioes}</td>
                <td>{f.optOuts}</td>
                <td>{f.semFit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>O estoque de leads</h2>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
        <Numero valor={m.base.leads} label="Leads na base" />
        <Numero valor={m.base.comWhatsapp} label="Com WhatsApp"
          hint="sem número não existe outbound" />
        <Numero valor={m.base.aprovaveis} label="Aprováveis (A/B)" />
        <Numero valor={m.base.prontosParaDisparo} label="Prontos para disparo"
          hint="A/B, com número e ainda não contatados" />
      </div>
      {m.base.prontosParaDisparo < 10 && (
        <div className="notice" style={{ marginTop: 12 }}>
          <b>Estoque baixo.</b> Com menos de 10 empresas prontas, o gargalo não é a mensagem nem a IA —
          é não ter com quem falar. Minerar número e trazer lead novo rende mais que afinar copy.
        </div>
      )}

      <h2>Mensagens no período</h2>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
        <Numero valor={m.mensagens.enviadas} label="Enviadas" />
        <Numero valor={m.mensagens.bloqueadas} label="Bloqueadas"
          hint="recusadas pela Meta ou pela compliance" />
        <Numero valor={m.mensagens.respostasIa} label="Respostas do Rafael" />
      </div>

      <h2>Últimas mensagens</h2>
      <div className="panel">
        {m.ultimos.length === 0 && <p className="hint">nenhuma conversa ainda</p>}
        {m.ultimos.map((u, i) => (
          <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <b>{u.empresa}</b> <span className="hint">· {u.origem} · {dataHora(u.quando)}</span>
            <div className="sub">{u.oQue}</div>
          </div>
        ))}
      </div>

      {m.testes.contatados > 0 && (
        <>
          <h2>Testes (fora dos números acima)</h2>
          <div className="panel">
            <p className="sub" style={{ margin: 0 }}>
              {m.testes.contatados} contatado(s) · {m.testes.responderam} respondeu(ram) ·{" "}
              {m.testes.reunioes} reunião(ões). Cobaias não entram na conta do piloto.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
