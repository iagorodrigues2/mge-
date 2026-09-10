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

export const TEMPLATES_ESPERADOS = [ABORDAGEM_GERAL, ABORDAGEM_INDUSTRIA, RETOMADA];

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
export function templateParaEtapa(step: string, lead: Lead): WaTemplate | null {
  if (step === "contato_inicial") return temPerfilConfirmado(lead) ? ABORDAGEM_INDUSTRIA : ABORDAGEM_GERAL;
  if (step === "followup_1" || step === "followup_2") return RETOMADA;
  return null;
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
