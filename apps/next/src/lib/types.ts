// Tipos centrais da máquina de vendas.

export type LeadStage =
  | "novo"
  | "pesquisado"
  | "aprovado"
  | "contatado"
  | "em_conversa"
  | "reuniao_marcada"
  | "proposta_enviada"
  | "ganho"
  | "perdido"
  | "nutrir"
  | "nao_abordar"
  | "opt_out";

export type Potential = "A" | "B" | "NUTRIR" | "NAO_ABORDAR";

export interface ScoreBreakdown {
  model?: "legacy";
  product_fit: number;
  marketplace_gap: number;
  business_structure: number;
  catalog_quality: number;
  investment_signals: number;
  contactability: number;
  problem_clarity: number;
  total: number;
  potential: Potential;
  confidence: "alto" | "medio" | "baixo";
  rationale: string;
}

// Score alinhado ao ICP (fabricante/indústria/distribuidor/importador).
// Convive com o legado: lead.score pode ser um ou outro (discriminado por `model`).
export interface IcpScore {
  model: "icp";
  perfil_icp: number; // 0-30 (tipo de empresa, pelo CNAE)
  perfil_tipo: string; // "Indústria / fabricante" | "Distribuidor / atacadista" | ...
  lacuna_marketplace: number; // 0-25
  porte_tradicao: number; // 0-15
  produto_marca: number; // 0-15
  contatabilidade: number; // 0-15
  total: number;
  potential: Potential;
  confidence: "alto" | "medio" | "baixo";
  rationale: string;
}

// Métricas de seller de marketplace (fonte: JoomPulse — Mercado Livre/Shopee).
export interface SellerMetrics {
  mlId?: string;
  receitaMes: number; // receita média mensal (R$)
  vendasMes: number; // vendas médias mensais
  vendasTotal: number;
  produtos: number;
  ticket: number; // ticket médio (R$)
  rating: number; // 0-5
  trend: number; // tendência de vendas (%)
  registrado?: string; // data de registro no ML
  marcas?: number; // quantas marcas distintas vende (poucas = foco/marca própria)
  ownBrand?: boolean; // o nome do seller aparece nas marcas (dono de marca)
}

// Score de seller de marketplace (já vende — o foco é oportunidade/estruturação).
export interface SellerScore {
  model: "seller";
  tipo: string; // "Seller ML — atacado" | "Seller ML — indústria" | ...
  total: number;
  potential: Potential;
  confidence: "alto" | "medio" | "baixo";
  rationale: string;
}

export type LeadScore = ScoreBreakdown | IcpScore | SellerScore;

// Mensagem de uma conversa de WhatsApp conduzida pela IA (agente Vendedor).
export interface ConversationMsg {
  role: "lead" | "ia" | "sistema"; // quem falou
  text: string;
  at: string; // ISO
}

// Resultado de um turno do agente Vendedor (o que a IA decidiu fazer).
export type SdrAction =
  | "continuar" // segue conversando
  | "agendar" // lead topou uma call com o Iago (CLAUDE V3 §10)
  | "handoff_fechamento" // quer fechar/assinar agora → chama o Iago
  | "sem_fit" // NÓS concluímos que nenhum programa resolve (§5/§20/§21) — é honestidade, não perda
  | "nao_interessado" // o LEAD recusou → nutrir
  | "opt_out"; // pediu pra não receber mais (§11 — lista exata em sdr-guards.ts)

// ---- Estado do Vendedor (CLAUDE V3) ----------------------------------------
// V3 é deliberadamente mais leve que o Prompt Mestre antigo: sem fases rígidas,
// sem slots de descoberta obrigatórios, sem gate de preço (§18: responde a
// tabela na hora quando perguntado) e sem conta de payback. O que sobra aqui é
// só o necessário pra Porteiro/dashboard terem contexto e pra alguns poucos
// freios de segurança (identidade, invenção, autorização) funcionarem.

// Segmentação do lead (§5) — nunca decide sozinha o produto, mas calibra o
// tom: não vender básico pra quem já é avançado, não afundar em detalhe quem
// ainda está descobrindo se a operação existe.
export type NivelLead = "iniciante" | "operador" | "avancado" | "desconhecida";

// Nível de interesse auto-reportado pela IA a cada turno — substitui o score
// de 7 eixos do sistema antigo (não há mais fórmula de pontuação: V3 confia no
// julgamento da IA sobre dor real + aderência + urgência, e pede pra explicar
// o motivo, não pra computar uma nota).
export interface SdrCommercialScore {
  interesse: "baixo" | "medio" | "alto";
  motivo: string; // 1 frase: por que este nível
}

export interface SdrState {
  origem: "inbound" | "outbound"; // muda a abertura
  nivel: NivelLead;
  ofertaSugerida?: string; // code do pacote que a conversa está apontando agora (pode mudar)
  ofertaMotivo?: string; // por que ESTE e não outro
  perguntasFeitas: number; // heurística leve (§9 "pergunte menos e melhor") — orienta, não bloqueia
  score?: SdrCommercialScore;
  riscos?: string[]; // sinais de cliente/negócio problemático, se houver (§28)
  sinaisIntencao?: string[]; // ex.: "pediu pra falar agora"
  reuniaoImediata?: boolean; // pediu pra falar AGORA/hoje/em minutos — prioriza o Porteiro
  prioridadeAgenda?: "alta" | "normal";
  updatedAt: string;
}

export interface OutreachAttempt {
  step: string; // contato_inicial | followup_1 | ...
  channel: "whatsapp" | "email";
  message: string;
  status: "enviado" | "rascunho" | "bloqueado" | "assistido";
  detail?: string; // link wa.me, id da mensagem, motivo do bloqueio
  at: string; // ISO
}

export interface Lead {
  id: string;
  empresa: string;
  segmento: string;
  cidade?: string;
  uf?: string;
  website?: string;
  instagram?: string;
  contato_nome?: string;
  telefone?: string; // E.164 sem símbolos p/ wa.me (ex: 5541999999999)
  whatsapp?: string; // CELULAR com WhatsApp, minerado do site (§ whatsapp-finder)
  whatsapp_fonte?: string; // wa.me | api.whatsapp | texto — e a URL de origem
  whatsapp_at?: string; // ISO — quando foi encontrado
  whatsapp_tentado_at?: string; // ISO — última varredura (achando ou não): faz a fila andar
  email?: string;

  // sinais coletados (públicos) usados no score
  has_physical_product?: boolean;
  catalog_size?: number;
  has_own_brand?: boolean;
  years_active?: number;
  has_website?: boolean;
  has_instagram?: boolean;
  marketplace_presence?: { mercado_livre?: boolean; amazon?: boolean; shopee?: boolean };
  marketplace_quality?: "boa" | "fraca" | "ausente";
  investment_signal?: "alto" | "medio" | "baixo";
  problem_signal?: "alto" | "medio" | "baixo";
  decision_maker_identified?: boolean;
  public_contact?: boolean;

  // fatos p/ a mensagem
  fato_objetivo?: string;
  oportunidade?: string;
  canal_ou_categoria?: string;

  // dados cadastrais confirmados (enriquecimento BrasilAPI — Receita Federal)
  cnpj?: string; // 14 dígitos, sem símbolos
  razao_social?: string;
  nome_fantasia?: string;
  cnae?: string; // código CNAE principal
  cnae_descricao?: string;
  porte?: string; // MICRO EMPRESA | EMPRESA DE PEQUENO PORTE | DEMAIS...
  situacao_cadastral?: string; // ATIVA | BAIXADA | SUSPENSA...
  data_abertura?: string; // YYYY-MM-DD (data_inicio_atividade)
  enriched_at?: string; // ISO — quando foi enriquecido
  enrich_source?: string; // brasilapi
  qualified_at?: string; // ISO — quando passou pela qualificação (perfil ICP + marketplace)
  perfil_hint?: "industria" | "distribuidor" | "importador" | "marca_propria"; // inferido do site quando não há CNAE
  seller?: SellerMetrics; // métricas de marketplace (JoomPulse), quando o lead é um seller

  score?: LeadScore;
  inbound?: boolean; // veio até nós (form/Instagram/WhatsApp) → abertura diferente (§8)
  conversation?: ConversationMsg[]; // histórico da conversa conduzida pela IA
  sdr?: SdrState; // estado do diagnóstico conduzido pela IA (fase, slots, business case)
  handoff_reason?: string; // por que o Porteiro escalou pro Iago
  handoff_at?: string; // ISO — quando escalou pro fechamento
  porteiro_avisos?: string[]; // motivos já avisados ao Iago (evita e-mail repetido)
  stage: LeadStage;
  approved: boolean;
  opt_out: boolean;
  source: string; // origem: scout_gerado | scout_busca | import
  attempts: OutreachAttempt[];
  createdAt: string;
  updatedAt: string;
}

// ---- Precificação (seção 3) — NUNCA hard-coded na UI; vive aqui/no store ----
export interface ServicePackage {
  code: string; // diagnostico_marketplace | diagnostico_importacao | importacao_completa | implantacao_360 | premium
  nome: string;
  precoRef: number; // preço de referência (tabela); 0 quando ocultarPreco = true
  precoFundador?: number; // condição Cliente Fundador, quando houver
  percentualFOB?: number; // ex.: 5 → "+ 5% sobre o valor FOB importado" (Importação Completa)
  duracaoDias?: number; // prazo de ENTREGA (diagnósticos: 15) ou duração do programa (360: 365) — ver texto no prompt
  reunioes?: number; // nº de reuniões previstas no formato (360: 13)
  creditoPara?: string; // code de outro pacote: o valor pago aqui vira crédito lá dentro da janela
  creditoJanelaDias?: number; // ex.: 15 (Diagnóstico de Importação → Importação Completa)
  parcelamento: "projeto_90" | "anual" | "avulso"; // molde de parcelas
  ocultarPreco?: boolean; // não divulgar preço sem autorização do Iago (Premium — CLAUDE V3 §6)
  destaque?: boolean; // oferta principal
  ativo: boolean;
}

// ---- Proposta (etapa 12) ----
export type ProposalStatus = "rascunho" | "enviada" | "aceita" | "perdida";
export interface Proposal {
  id: string;
  leadId: string;
  empresa: string;
  packageCode: string;
  nome: string;
  valor: number; // valor negociado (default = precoRef)
  condicaoPagamento: string;
  diagnostico?: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  acceptedAt?: string;
  lostReason?: string;
}

// ---- Financeiro (etapa 14) — "ganho e recebido" só após 1ª parcela paga ----
export type InstallmentStatus = "pendente" | "pago" | "atrasado";
export interface Installment {
  n: number;
  label: string; // "Entrada (50%)"...
  valor: number;
  dueDate?: string;
  status: InstallmentStatus;
  paidAt?: string;
}
export type DealStatus =
  | "aguardando_entrada"
  | "entrada_recebida" // = ganho e recebido
  | "em_andamento"
  | "quitado"
  | "inadimplente"
  | "cancelado";
export interface Deal {
  id: string;
  proposalId: string;
  leadId: string;
  empresa: string;
  packageCode: string;
  valor: number;
  installments: Installment[];
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Db {
  leads: Lead[];
  blocklist: string[]; // telefones/domínios bloqueados
  optOut: string[];
  packages: ServicePackage[];
  proposals: Proposal[];
  deals: Deal[];
}
