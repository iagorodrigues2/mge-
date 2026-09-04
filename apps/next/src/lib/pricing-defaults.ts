// Pacotes de serviço padrão — matriz comercial oficial do CLAUDE V3
// (CLAUDE_V3_Maquina_de_Vendas_Iago.md, seção 6/27). Semeados no store na 1ª
// execução e editáveis em Configurações — a UI NUNCA lê preço de constante,
// sempre do store. Isto é só o valor inicial de tabela.
import type { ServicePackage } from "./types";

export const DEFAULT_PACKAGES: ServicePackage[] = [
  {
    code: "diagnostico_marketplace",
    nome: "Diagnóstico Marketplace",
    precoRef: 5000,
    duracaoDias: 15, // prazo de entrega da análise, não acompanhamento contínuo
    parcelamento: "avulso",
    ativo: true,
  },
  {
    code: "diagnostico_importacao",
    nome: "Diagnóstico de Importação",
    precoRef: 5000,
    duracaoDias: 15,
    creditoPara: "importacao_completa",
    creditoJanelaDias: 15, // se contratar a Completa em até 15 dias, os R$5.000 abatem
    parcelamento: "avulso",
    ativo: true,
  },
  {
    code: "importacao_completa",
    nome: "Importação Completa",
    precoRef: 10000, // + percentualFOB sobre o valor FOB efetivamente importado
    percentualFOB: 5,
    parcelamento: "avulso",
    ativo: true,
  },
  {
    code: "implantacao_360",
    nome: "Implantação 360",
    precoRef: 30000,
    duracaoDias: 365,
    reunioes: 13, // 1 onboarding + 12 mensais
    parcelamento: "anual",
    destaque: true, // oferta principal
    ativo: true,
  },
  {
    code: "premium",
    nome: "Acompanhamento Estratégico Executivo",
    precoRef: 0, // sob consulta — nunca divulgar sem autorização do Iago
    ocultarPreco: true,
    duracaoDias: 90, // mínimo sugerido: 3 meses
    parcelamento: "avulso",
    ativo: true,
  },
];
