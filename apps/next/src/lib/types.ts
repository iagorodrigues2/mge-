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
  | "agendar" // lead topou reunião → agente Agenda
  | "handoff_fechamento" // pronto pra fechar → chama o Iago
  | "sem_fit" // NÓS concluímos que nenhum programa resolve (§5/§34) — é honestidade, não perda
  | "nao_interessado" // o LEAD recusou → nutrir
  | "opt_out"; // pediu pra não receber mais

// ---- Máquina de diagnóstico do Vendedor (Prompt Mestre §5, §11, §21) ----
// A IA NÃO escolhe produto por intuição: ela preenche estes slots, o código
// calcula a fase e só então libera oferta e preço.

// O que sabemos sobre cada slot. "hipotese" nunca pode ser tratada como fato (§6).
export type FactStatus = "desconhecido" | "hipotese" | "confirmado";

export interface DiscoveryFact {
  status: FactStatus;
  valor?: string; // o que foi apurado, nas palavras do lead
  at?: string; // ISO — quando entrou no estado atual
}

// Descoberta em CAMADAS (Correção Prioritária §4). As 4 primeiras são o que o
// chat precisa; as demais pertencem à REUNIÃO e são opcionais aqui — perguntar
// tudo isso no WhatsApp é o "montar a DRE por chat" que a §2 proíbe.
export type DiscoverySlot =
  | "motivo" // camada 1: o que te fez procurar a gente
  | "problema" // camada 2: a dor PRINCIPAL (uma por vez)
  | "situacao" // camada 3: contexto leve — já vende? canais? sozinho ou equipe?
  | "prioridade" // camada 4: quer resolver agora?
  // --- daqui pra baixo é assunto de REUNIÃO, não de chat (§1, §8, §17) ---
  | "causa"
  | "impacto" // números só quando mudam a decisão (§13)
  | "capacidade"
  | "decisao"
  | "criterio";

// Ordem em que o chat persegue as camadas.
export const DISCOVERY_ORDER: DiscoverySlot[] = [
  "motivo", "problema", "situacao", "prioridade",
  "causa", "impacto", "capacidade", "decisao", "criterio",
];

// O que o CHAT precisa. O resto fica pra reunião (§16: não ter medo de marcar
// reunião sem saber tudo).
export const SLOTS_DO_CHAT: DiscoverySlot[] = ["motivo", "problema", "situacao", "prioridade"];

// Fase da conversa — DERIVADA dos slots pelo código, nunca escolhida pela IA.
// Fluxo da §14: abertura → motivo → dor → contexto → percepção → fit → próximo passo.
export type SdrPhase =
  | "abertura" // ainda não sabemos por que ele chegou
  | "motivo" // camada 1
  | "dor" // camada 2
  | "contexto" // camada 3
  | "percepcao" // precisa entregar uma leitura útil antes de convidar (§7, §18)
  | "fit" // camada 4/5: prioridade + aderência
  | "proximo_passo" // agendar, orientar, nutrir ou desqualificar
  | "diagnostico_profundo" // só se o LEAD puxar preço/oferta no chat
  | "recomendacao"; // oferta e preço (normalmente já com o Iago)

// Conta de retorno construída com os números do próprio lead (§15).
// Nunca benchmark, nunca percentual inventado.
export interface BusinessCase {
  valorProjeto: number; // preço do pacote candidato (vem do banco)
  mesesPayback: number; // horizonte combinado (default 6)
  ganhoMensalNecessario: number; // valorProjeto / mesesPayback
  impactoMensalEstimado?: number; // quanto está em jogo por mês, pelos números do lead
  viavel?: boolean; // impactoMensal >= ganhoMensalNecessario
  base: string; // quais números do lead foram usados
  at: string; // ISO
}

// Score comercial vivo (§35) — recalculado a cada turno a partir do estado.
export interface SdrCommercialScore {
  fit: number; // 0-10 produto/segmento/estrutura
  dor: number; // 0-10 real, relevante, mensurável
  impacto: number; // 0-10 financeiro/operacional/estratégico
  urgencia: number; // 0-10
  autoridade: number; // 0-10 decisor x influenciador
  capacidade: number; // 0-10 financeira/equipe/execução
  confianca: number; // 0-10 relação/provas/objeções
  total: number; // 0-70
}

// Sinais estruturados que a IA reporta e o CÓDIGO usa pra escolher a oferta.
export type NecessidadeTipo =
  | "clareza" // ainda não sabe qual é o problema → diagnóstico
  | "direcao" // tem quem execute, falta decisão → mentoria
  | "montar_operacao" // precisa estruturar/corrigir a operação → implantação
  | "escala_continua" // operação madura, quer escala e acompanhamento → anual
  | "nenhuma" // nada do que vendemos resolve → sem fit
  | "desconhecida";

export type CapacidadeExecucao = "tem_equipe" | "parcial" | "sem_equipe" | "desconhecida";

export interface SdrSignals {
  necessidade: NecessidadeTipo;
  capacidadeExecucao: CapacidadeExecucao;
  impactoMensalEstimado?: number; // R$/mês em jogo, derivado do que o LEAD disse
  riscos?: string[]; // §34 — sinais de cliente ruim
  // Os 4 elementos que a Correção §16 exige para marcar reunião. Nada além
  // disso é pré-requisito: a reunião é justamente o lugar de aprofundar.
  problemaReal?: boolean;
  aderencia?: boolean; // o problema tem a ver com o que o Iago faz
  vontadeResolver?: boolean;
  possibilidadeContratacao?: boolean;
}

export interface SdrState {
  origem: "inbound" | "outbound"; // §8 — muda a abertura
  phase: SdrPhase;
  discovery: Record<DiscoverySlot, DiscoveryFact>;
  signals: SdrSignals;
  businessCase?: BusinessCase;
  ofertaRecomendada?: string; // code do pacote — só é preenchido depois do gate
  ofertaMotivo?: string; // por que ESTA e não outra
  precoRevelado?: boolean; // já falamos valor?
  leadPediuPreco?: number; // quantas vezes o lead pediu preço

  // --- Orçamento de perguntas (Correção §3, §17, §19) ---
  perguntasFeitas: number; // quantas perguntas de descoberta já fizemos
  percepcaoEntregue: boolean; // já demos uma leitura útil? (§7, §18)
  turnosSoPergunta: number; // pergunta → pergunta → pergunta = robô (§6)
  fadigaDetectada?: boolean; // o lead reclamou do interrogatório (§9)

  score?: SdrCommercialScore;
  riscos?: string[];
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
