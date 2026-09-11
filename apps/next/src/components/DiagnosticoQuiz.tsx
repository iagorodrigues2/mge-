"use client";
import { useState } from "react";
import { DORES, FATURAMENTOS, MOMENTOS } from "@/lib/diagnostico";

// Quiz de 4 telas. Cada resposta de múltipla escolha avança sozinha (o clique
// já é a resposta — botão "continuar" só adiciona atrito). A última tela pede
// nome/empresa/WhatsApp e envia.
//
// Rota "prioritario": mostra o botão do WhatsApp com a mensagem pronta.
// Rota "nutrir": agradece e manda pro conteúdo do perfil — sem WhatsApp.

type Rota = "prioritario" | "nutrir";
const TOTAL = 4;

const s = {
  opcao: {
    display: "block", width: "100%", textAlign: "left" as const, padding: "14px 16px",
    marginBottom: 10, fontSize: 16, borderRadius: 12, lineHeight: 1.3,
  },
  input: { width: "100%", padding: "12px 14px", fontSize: 16, marginBottom: 12, borderRadius: 10 },
  label: { display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 },
};

export default function DiagnosticoQuiz({ instagram }: { instagram: string }) {
  const [etapa, setEtapa] = useState(1);
  const [momento, setMomento] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [dor, setDor] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ig, setIg] = useState("");
  const [site, setSite] = useState(""); // honeypot
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ rota: Rota; wa: string | null; nome: string } | null>(null);

  function escolher(set: (v: string) => void, v: string) {
    set(v);
    setTimeout(() => setEtapa((e) => Math.min(e + 1, TOTAL)), 180);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, empresa, momento, faturamento, dor, whatsapp, instagram: ig, site }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) throw new Error(d.error ?? "não foi possível enviar");
      setResultado({ rota: d.rota, wa: d.wa ?? null, nome: d.nome ?? nome });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    const primeiro = resultado.nome.split(" ")[0];
    if (resultado.rota === "nutrir") {
      return (
        <section className="panel">
          <h2 style={{ marginTop: 0, textTransform: "none", fontSize: 22, color: "var(--text)" }}>
            {primeiro}, ainda não é hora de consultoria — e isso é bom.
          </h2>
          <p>
            Consultoria de implantação é pra quem já tem produto, estoque e caixa pra operar.
            No seu momento, o que muda o jogo é executar o básico certo — e isso eu publico de graça.
          </p>
          <p>
            Segue o perfil, salva os conteúdos de <b>Mercado Livre</b> e <b>importação</b>, e quando
            a operação estiver rodando, volta aqui.
          </p>
          <a className="btn primary" href={`https://instagram.com/${instagram}`} style={{ display: "inline-block", marginTop: 8 }}>
            Ir pro perfil @{instagram}
          </a>
        </section>
      );
    }
    return (
      <section className="panel">
        <h2 style={{ marginTop: 0, textTransform: "none", fontSize: 22, color: "var(--text)" }}>
          {primeiro}, sua operação tem perfil pra análise.
        </h2>
        <p>
          Pelo que você respondeu, faz sentido olhar sua operação de perto. O próximo passo é
          uma conversa rápida no WhatsApp: você conta o cenário, e a gente diz com franqueza
          se existe um problema grande o suficiente pra justificar um projeto — ou não.
        </p>
        {resultado.wa ? (
          <a className="btn primary" href={resultado.wa} style={{ display: "inline-block", fontSize: 17, padding: "14px 22px" }}>
            Abrir conversa no WhatsApp →
          </a>
        ) : (
          <p className="hint">Recebemos suas respostas. Você vai receber uma mensagem no WhatsApp informado.</p>
        )}
        {resultado.wa && (
          <p className="hint" style={{ marginTop: 14 }}>
            A mensagem já vai escrita — é só enviar. Quem responde primeiro é a equipe comercial do Iago.
          </p>
        )}
      </section>
    );
  }

  const pct = Math.round(((etapa - 1) / TOTAL) * 100);

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        <span>Etapa {etapa}/{TOTAL}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 22 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 2, transition: "width .4s" }} />
      </div>

      {etapa === 1 && (
        <>
          <h2 style={{ marginTop: 0, textTransform: "none", fontSize: 22, color: "var(--text)" }}>Como está sua operação hoje?</h2>
          {MOMENTOS.map((o) => (
            <button key={o} type="button" style={s.opcao} className={momento === o ? "primary" : ""} onClick={() => escolher(setMomento, o)}>{o}</button>
          ))}
        </>
      )}

      {etapa === 2 && (
        <>
          <h2 style={{ marginTop: 0, textTransform: "none", fontSize: 22, color: "var(--text)" }}>Faturamento mensal da empresa</h2>
          <p className="hint" style={{ marginTop: -8 }}>Todos os canais, não só marketplace. Fica só entre nós.</p>
          {FATURAMENTOS.map((o) => (
            <button key={o} type="button" style={s.opcao} className={faturamento === o ? "primary" : ""} onClick={() => escolher(setFaturamento, o)}>{o}</button>
          ))}
        </>
      )}

      {etapa === 3 && (
        <>
          <h2 style={{ marginTop: 0, textTransform: "none", fontSize: 22, color: "var(--text)" }}>O que mais trava hoje?</h2>
          {DORES.map((o) => (
            <button key={o} type="button" style={s.opcao} className={dor === o ? "primary" : ""} onClick={() => escolher(setDor, o)}>{o}</button>
          ))}
        </>
      )}

      {etapa === 4 && (
        <form onSubmit={enviar}>
          <h2 style={{ marginTop: 0, textTransform: "none", fontSize: 22, color: "var(--text)" }}>Pra onde mandamos a análise?</h2>
          <label style={s.label} htmlFor="nome">Seu nome</label>
          <input id="nome" style={s.input} value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          <label style={s.label} htmlFor="empresa">Empresa / marca</label>
          <input id="empresa" style={s.input} value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
          <label style={s.label} htmlFor="whatsapp">WhatsApp (DDD + número)</label>
          <input id="whatsapp" style={s.input} inputMode="tel" placeholder="(11) 98765-4321" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
          <label style={s.label} htmlFor="ig">Instagram da empresa (opcional)</label>
          <input id="ig" style={s.input} placeholder="@suamarca" value={ig} onChange={(e) => setIg(e.target.value)} />
          {/* honeypot: fora da tela, sem tab. Humano não preenche. */}
          <input tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} style={{ position: "absolute", left: -9999, opacity: 0 }} aria-hidden="true" />
          {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}
          <button className="primary" type="submit" disabled={enviando} style={{ width: "100%", padding: 14, fontSize: 17 }}>
            {enviando ? "Enviando…" : "Ver minha análise →"}
          </button>
          <p className="hint" style={{ marginTop: 10 }}>
            Sem spam. Seus dados ficam com a equipe do Iago e seguem a <a href="/privacidade">política de privacidade</a>.
          </p>
        </form>
      )}

      {etapa > 1 && (
        <button type="button" className="ghost" onClick={() => setEtapa((e) => e - 1)} style={{ marginTop: 8, fontSize: 13 }}>← Voltar</button>
      )}
    </section>
  );
}
