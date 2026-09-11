// Consulta o estado dos templates na WABA de produção.
//
// Existe separado do endpoint de diagnóstico porque o DISPARO EM LOTE também
// precisa da resposta antes de queimar mensagem: template ausente ou ainda em
// análise faz a Meta recusar uma por uma, e cada recusa vira uma tentativa
// "bloqueado" no histórico do lead sem nenhum ganho.
import { TEMPLATES_ESPERADOS, TEMPLATES_OUTBOUND, TEMPLATES_OUTBOUND_V2 } from "./wa-templates";

export const WABA_ID = process.env.WHATSAPP_WABA_ID || "1096814143280285";

export interface ConferenciaTemplate {
  usadoPeloCodigo: string;
  idioma: string;
  existeNaWaba: boolean;
  status: string | null;
  categoria: string | null;
  qualidade: string | null;
  pronto: boolean;
}

export interface ConferenciaWaba {
  ok: boolean; // TODOS os templates aprovados (visão do painel)
  okOutbound: boolean; // só os que o primeiro contato usa — é este que libera o disparo
  erro?: string;
  wabaId: string;
  numeros: unknown;
  conferencia: ConferenciaTemplate[];
  ausentes: ConferenciaTemplate[];
  emAnalise: ConferenciaTemplate[];
  reprovados: ConferenciaTemplate[];
  diagnostico: string;
  templatesNaWaba: { nome: string; status: string; idioma: string; categoria: string }[];
}

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  quality_score?: { score?: string };
}

// O PERFIL COMERCIAL é a primeira coisa que o lead vê quando chega uma
// mensagem de um número desconhecido: foto, nome, descrição, site. Perfil vazio
// num contato frio parece golpe — e a decisão de bloquear acontece antes de ler
// o texto.
export interface PerfilWhats {
  ok: boolean;
  erro?: string;
  foto?: string | null;
  sobre?: string | null;
  descricao?: string | null;
  email?: string | null;
  sites?: string[];
  endereco?: string | null;
  setor?: string | null;
  faltando: string[];
}

export async function conferirPerfil(): Promise<PerfilWhats> {
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneId = process.env.WHATSAPP_BUSINESS_PHONE_ID;
  if (!token || !phoneId) return { ok: false, erro: "WhatsApp não configurado", faltando: [] };

  const campos = "about,address,description,email,profile_picture_url,websites,vertical";
  const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/whatsapp_business_profile?fields=${campos}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = (await r.json()) as {
    data?: {
      about?: string; address?: string; description?: string; email?: string;
      profile_picture_url?: string; websites?: string[]; vertical?: string;
    }[];
    error?: { message: string };
  };
  if (!r.ok || d.error) return { ok: false, erro: d.error?.message ?? String(r.status), faltando: [] };

  const p = d.data?.[0] ?? {};
  const faltando: string[] = [];
  if (!p.profile_picture_url) faltando.push("foto de perfil");
  if (!p.description) faltando.push("descrição");
  if (!p.about) faltando.push("recado (about)");
  if (!p.websites?.length) faltando.push("site");
  if (!p.email) faltando.push("e-mail");
  if (!p.vertical) faltando.push("setor");

  return {
    ok: faltando.length === 0,
    foto: p.profile_picture_url ?? null,
    sobre: p.about ?? null,
    descricao: p.description ?? null,
    email: p.email ?? null,
    sites: p.websites ?? [],
    endereco: p.address ?? null,
    setor: p.vertical ?? null,
    faltando,
  };
}

export async function conferirTemplates(): Promise<ConferenciaWaba> {
  const vazio = {
    okOutbound: false,
    wabaId: WABA_ID,
    numeros: null,
    conferencia: [],
    ausentes: [],
    emAnalise: [],
    reprovados: [],
    templatesNaWaba: [],
  };
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  if (!token) {
    return { ...vazio, ok: false, erro: "WHATSAPP_BUSINESS_TOKEN não configurado", diagnostico: "sem credencial para consultar a Meta" };
  }

  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const campos = "name,status,category,language,quality_score";
  const [rTpl, rNum] = await Promise.all([
    fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/message_templates?fields=${campos}&limit=100`, auth),
    fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/phone_numbers?fields=display_phone_number,verified_name,quality_rating`, auth),
  ]);
  const dTpl = (await rTpl.json()) as { data?: MetaTemplate[]; error?: { message: string } };
  const dNum = (await rNum.json()) as { data?: unknown[]; error?: { message: string } };

  if (!rTpl.ok || dTpl.error) {
    return { ...vazio, ok: false, erro: dTpl.error?.message ?? String(rTpl.status), diagnostico: "a Meta recusou a consulta" };
  }

  const naMeta = dTpl.data ?? [];
  const conferencia: ConferenciaTemplate[] = TEMPLATES_ESPERADOS.map((esperado) => {
    const achado = naMeta.find((m) => m.name === esperado.name && m.language === esperado.lang);
    return {
      usadoPeloCodigo: esperado.name,
      idioma: esperado.lang,
      existeNaWaba: !!achado,
      status: achado?.status ?? null,
      categoria: achado?.category ?? null,
      qualidade: achado?.quality_score?.score ?? null,
      pronto: achado?.status === "APPROVED",
    };
  });

  // "não está pronto" tem três causas MUITO diferentes: sumido (conta errada ou
  // nome trocado) é problema nosso, PENDING é só esperar a Meta, e REJECTED
  // exige reescrever o texto.
  const ausentes = conferencia.filter((c) => !c.existeNaWaba);
  const emAnalise = conferencia.filter((c) => c.status === "PENDING" || c.status === "IN_APPEAL");
  const reprovados = conferencia.filter((c) => c.status === "REJECTED" || c.status === "DISABLED");

  const diagnostico = ausentes.length
    ? `faltam nesta WABA: ${ausentes.map((f) => f.usadoPeloCodigo).join(", ")} — foram criados em outra conta (a de teste) ou com nome/idioma diferente`
    : reprovados.length
      ? `reprovados pela Meta: ${reprovados.map((f) => f.usadoPeloCodigo).join(", ")} — reescrever o texto e reenviar`
      : emAnalise.length
        ? `em análise na Meta: ${emAnalise.map((f) => f.usadoPeloCodigo).join(", ")} — nome, idioma e categoria estão certos, é só aguardar a aprovação`
        : "todos os templates que o disparo usa estão APPROVED nesta WABA";

  // Cada família precisa de UMA versão aprovada — v1 ou v2. Exigir as duas
  // travaria o disparo enquanto a v2 estivesse em análise, sem motivo.
  const prontos = new Set(conferencia.filter((c) => c.pronto).map((c) => c.usadoPeloCodigo));
  const familias = TEMPLATES_OUTBOUND.map((v1, i) => [v1.name, TEMPLATES_OUTBOUND_V2[i].name]);
  return {
    ok: conferencia.every((c) => c.pronto),
    okOutbound: familias.every(([v1, v2]) => prontos.has(v1) || prontos.has(v2)),
    wabaId: WABA_ID,
    numeros: dNum.data ?? dNum.error?.message ?? null,
    conferencia,
    ausentes,
    emAnalise,
    reprovados,
    diagnostico,
    templatesNaWaba: naMeta.map((m) => ({ nome: m.name, status: m.status, idioma: m.language, categoria: m.category })),
  };
}
