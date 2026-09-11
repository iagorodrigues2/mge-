// Ponte entre a cadência do CRM e os TEMPLATES APROVADOS na Meta.
//
// Por que este arquivo existe: mensagem iniciada pela empresa só sai como
// template aprovado. Texto livre para lead frio é REJEITADO pela API — e era
// exatamente isso que o disparo fazia (`sendWhatsApp` com a copy do
// copywriter), ou seja, os templates aprovados em 2026-09-09 não estavam
// ligados em lugar nenhum.
//
// A janela de 24h de texto livre só abre DEPOIS que o lead responde. Enquanto
// ela está fechada, o único caminho é template; quando abre, o agente Vendedor
// assume e conversa livre.
//
// FONTE DA VERDADE: os textos abaixo são a CÓPIA do que está aprovado na Meta
// (`docs/templates-whatsapp-meta.md`). O corpo aqui não é o que a Meta envia —
// ela usa o dela — serve para (1) registrar no CRM o que foi enviado e (2)
// preencher o link wa.me no modo assistido (sem credenciais). Se o texto mudar
// na Meta, mude aqui junto, senão o histórico do lead mente.
import type { Lead } from "./types";

export interface WaTemplate {
  name: string; // nome exato aprovado na Meta
  lang: string;
  body: string; // corpo com {{1}}, {{2}}... igual ao aprovado
  variaveis: (lead: Lead) => string[];
}

// A Meta rejeita parâmetro vazio, com quebra de linha ou tab.
function param(valor: string | undefined, fallback: string): string {
  const limpo = (valor ?? "").replace(/\s+/g, " ").trim();
  return limpo || fallback;
}

// Saudação calculada no MOMENTO do envio, no fuso de São Paulo. A v1 tinha
// "Bom dia" escrito dentro do corpo aprovado — o que obrigava a disparar só de
// manhã e, pior, mandaria "Bom dia" às 15h no follow-up automático da cadência,
// que roda em horário que ninguém controla.
export function saudacaoAgora(agora = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(agora),
  );
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

// ---- v2: saudação por variável, e SEM nome ---------------------------------
//
// O nome saiu porque não temos o nome de verdade: "Bom dia, responsável" anuncia
// disparo automático na primeira linha. Sem nome a mensagem fica mais limpa, e o
// agente pergunta o nome quando a conversa engata.
//
// "Olá, {{1}}." resolve a regra da Meta de não começar com variável e continua
// natural em português — "Olá, boa tarde" é como se fala no WhatsApp comercial.
export const ABORDAGEM_GERAL_V2: WaTemplate = {
  name: "abordagem_geral_v2",
  lang: "pt_BR",
  body:
    "Olá, {{1}}. Aqui é o consultor comercial do Iago Rodrigues — ele trabalha com implantação e escala de operações de marketplace (Mercado Livre, Amazon, Shopee) e também com importação, para fabricantes e distribuidores.\n\n" +
    "Vi que a {{2}} atua com {{3}}. Trabalhamos com empresas nesse perfil na parte de margem, catálogo, estrutura de operação e, quando faz sentido, importação direta.\n\n" +
    "Faz sentido eu te explicar em duas linhas por que entrei em contato?",
  variaveis: (l) => [
    saudacaoAgora(),
    param(l.empresa, "sua empresa"),
    param(l.canal_ou_categoria || l.segmento, "produtos próprios"),
  ],
};

export const ABORDAGEM_INDUSTRIA_V2: WaTemplate = {
  name: "abordagem_industria_v2",
  lang: "pt_BR",
  body:
    "Olá, {{1}}. Aqui é o consultor comercial do Iago Rodrigues.\n\n" +
    "Ele trabalha com indústrias e distribuidores em duas frentes: estruturação da operação em marketplace (catálogo, margem, estoque, logística) e importação — do diagnóstico de viabilidade até o acompanhamento da operação completa.\n\n" +
    "Estou entrando em contato com a {{2}} porque o perfil de vocês é o tipo de operação em que ele costuma atuar. Posso te explicar rapidamente o motivo do contato?",
  variaveis: (l) => [saudacaoAgora(), param(l.empresa, "sua empresa")],
};

export const RETOMADA_V2: WaTemplate = {
  name: "retomada_sem_resposta_v2",
  lang: "pt_BR",
  body:
    "Olá, {{1}}. Retomando meu contato sobre a operação da {{2}}.\n\n" +
    "Não quero tomar seu tempo à toa: se não for prioridade agora, é só me dizer que eu encerro por aqui.\n\n" +
    "Se fizer sentido, me responde e eu explico em dois minutos.",
  variaveis: (l) => [saudacaoAgora(), param(l.empresa, "sua empresa")],
};

// ---- v1: ficam como fallback enquanto a v2 não é aprovada ------------------
export const ABORDAGEM_GERAL: WaTemplate = {
  name: "abordagem_geral_v1",
  lang: "pt_BR",
  body:
    "Bom dia, {{1}}. Aqui é o consultor comercial do Iago Rodrigues — ele trabalha com implantação e escala de operações de marketplace (Mercado Livre, Amazon, Shopee) e também com importação, para fabricantes e distribuidores.\n\n" +
    "Vi que a {{2}} atua com {{3}}. Trabalhamos com empresas nesse perfil na parte de margem, catálogo, estrutura de operação e, quando faz sentido, importação direta.\n\n" +
    "Faz sentido eu te explicar em duas linhas por que entrei em contato?",
  variaveis: (l) => [
    param(l.contato_nome, "responsável"),
    param(l.empresa, "sua empresa"),
    param(l.canal_ou_categoria || l.segmento, "produtos próprios"),
  ],
};

export const ABORDAGEM_INDUSTRIA: WaTemplate = {
  name: "abordagem_industria_v1",
  lang: "pt_BR",
  body:
    "Bom dia. Aqui é o consultor comercial do Iago Rodrigues.\n\n" +
    "Ele trabalha com indústrias e distribuidores em duas frentes: estruturação da operação em marketplace (catálogo, margem, estoque, logística) e importação — do diagnóstico de viabilidade até o acompanhamento da operação completa.\n\n" +
    "Estou entrando em contato com a {{1}} porque o perfil de vocês é o tipo de operação em que ele costuma atuar. Posso te explicar rapidamente o motivo do contato?",
  variaveis: (l) => [param(l.empresa, "sua empresa")],
};

export const RETOMADA: WaTemplate = {
  name: "retomada_sem_resposta_v1",
  lang: "pt_BR",
  body:
    "Bom dia, {{1}}. Retomando meu contato sobre a operação da {{2}}.\n\n" +
    "Não quero tomar seu tempo à toa: se não for prioridade agora, é só me dizer que eu encerro por aqui.\n\n" +
    "Se fizer sentido, me responde e eu explico em dois minutos.",
  variaveis: (l) => [param(l.contato_nome, "responsável"), param(l.empresa, "sua empresa")],
};

// Lembrete de reunião. Categoria UTILITY, não Marketing: é a confirmação de um
// compromisso que o próprio lead agendou — classificação certa e mais barata.
//
// Existe porque a janela de 24h de texto livre é aberta pelo LEAD, e uma call
// marcada para daqui a três dias tem a janela fechada na hora do lembrete. Sem
// template, o lembrete por WhatsApp simplesmente não sairia — que é a maioria
// dos casos, já que a agenda oferece os próximos dias.
export const LEMBRETE_REUNIAO: WaTemplate = {
  name: "lembrete_reuniao_v1",
  lang: "pt_BR",
  body:
    "Olá, {{1}}. Passando para confirmar sua conversa com o Iago Rodrigues.\n\n" +
    "Quando: {{2}}\n" +
    "Link da call: {{3}}\n\n" +
    "Se precisar remarcar, é só responder esta mensagem.",
  variaveis: (l) => [
    param(l.contato_nome, "tudo bem"),
    param(l.reuniao?.rotulo, "no horário combinado"),
    param(l.reuniao?.meet, "combinamos por aqui"),
  ],
};

// Os que o OUTBOUND usa. É esta lista que trava o disparo em lote — o lembrete
// de reunião não participa do primeiro contato, e exigir que ele esteja
// aprovado adiaria o piloto inteiro por um template que ninguém vai usar ali.
export const TEMPLATES_OUTBOUND = [ABORDAGEM_GERAL, ABORDAGEM_INDUSTRIA, RETOMADA];
export const TEMPLATES_OUTBOUND_V2 = [ABORDAGEM_GERAL_V2, ABORDAGEM_INDUSTRIA_V2, RETOMADA_V2];

// Todos, para o diagnóstico: o painel mostra o estado dos quatro.
export const TEMPLATES_ESPERADOS = [...TEMPLATES_OUTBOUND_V2, ...TEMPLATES_OUTBOUND, LEMBRETE_REUNIAO];

// O template "industrial" é mais forte quando o perfil está CONFIRMADO (CNAE da
// Receita ou pista lida no site): ele afirma "o perfil de vocês é o tipo de
// operação em que ele costuma atuar", e isso não pode ser chute — é a hard rule
// anti-invenção. Sem perfil confirmado, vai o geral, que só usa o segmento.
function temPerfilConfirmado(lead: Lead): boolean {
  if (lead.cnae) return true;
  return lead.perfil_hint === "industria" || lead.perfil_hint === "distribuidor" || lead.perfil_hint === "importador";
}

// Etapa da cadência → template aprovado. null = não existe template para a
// etapa, logo ela só pode sair com a janela de 24h aberta.
//
// followup_1 e followup_2 usam a MESMA retomada: são as duas (e únicas)
// retomadas que o número aguenta sem virar denúncia. `encerramento` fica de
// fora de propósito — gastar um template pago para dizer "vou parar de te
// procurar" só produz custo e risco de denúncia.
// Candidatos em ordem de preferência: a v2 (saudação certa, sem nome falso) e,
// enquanto ela estiver em análise na Meta, a v1 já aprovada. Passar `aprovados`
// permite escolher a melhor DISPONÍVEL; sem essa informação fica a v1, que é a
// que com certeza existe — errar para o lado do template que funciona.
export function candidatosParaEtapa(step: string, lead: Lead): WaTemplate[] {
  if (step === "contato_inicial") {
    return temPerfilConfirmado(lead)
      ? [ABORDAGEM_INDUSTRIA_V2, ABORDAGEM_INDUSTRIA]
      : [ABORDAGEM_GERAL_V2, ABORDAGEM_GERAL];
  }
  if (step === "followup_1" || step === "followup_2") return [RETOMADA_V2, RETOMADA];
  return [];
}

export function templateParaEtapa(step: string, lead: Lead, aprovados?: Set<string>): WaTemplate | null {
  const candidatos = candidatosParaEtapa(step, lead);
  if (!candidatos.length) return null;
  if (!aprovados) return candidatos[candidatos.length - 1]; // sem saber: a mais antiga, que já está aprovada
  return candidatos.find((c) => aprovados.has(c.name)) ?? candidatos[candidatos.length - 1];
}

// Monta o texto final (o que vai para o histórico do lead e para o wa.me).
export function renderTemplate(tpl: WaTemplate, lead: Lead): string {
  const vars = tpl.variaveis(lead);
  return tpl.body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[Number(n) - 1] ?? "");
}

// A janela de 24h de texto livre está aberta? Ela abre a cada mensagem que o
// LEAD manda — nunca com o que nós mandamos.
export function janelaAberta(lead: Lead, agora = Date.now()): boolean {
  const ultimaDoLead = [...(lead.conversation ?? [])].reverse().find((m) => m.role === "lead");
  if (!ultimaDoLead) return false;
  const t = new Date(ultimaDoLead.at).getTime();
  if (!Number.isFinite(t)) return false;
  return agora - t < 24 * 60 * 60 * 1000;
}
