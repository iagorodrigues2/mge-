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

export type LeadScore = ScoreBreakdown | IcpScore;

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

  score?: LeadScore;
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
  code: string; // diagnostico | mentoria_90 | implantacao_90 | programa_anual
  nome: string;
  precoRef: number; // preço de referência (tabela)
  precoFundador?: number; // condição Cliente Fundador, quando houver
  duracaoDias?: number; // 90, 365...
  parcelamento: "projeto_90" | "anual" | "avulso"; // molde de parcelas
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
