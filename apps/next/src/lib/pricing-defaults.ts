// Pacotes de serviço padrão (seção 3.1 / docs/manual-comercial.md).
// Semeados no store na 1ª execução e editáveis em Configurações — a UI NUNCA
// lê preço de constante, sempre do store. Isto é só o valor inicial de tabela.
import type { ServicePackage } from "./types";

export const DEFAULT_PACKAGES: ServicePackage[] = [
  {
    code: "diagnostico",
    nome: "Diagnóstico Executivo Marketplace",
    precoRef: 2500,
    parcelamento: "avulso",
    ativo: true,
  },
  {
    code: "mentoria_90",
    nome: "Mentoria Marketplace 90",
    precoRef: 9000,
    duracaoDias: 90,
    parcelamento: "projeto_90",
    ativo: true,
  },
  {
    code: "implantacao_90",
    nome: "Implantação Marketplace 90",
    precoRef: 20000,
    duracaoDias: 90,
    parcelamento: "projeto_90",
    destaque: true, // oferta principal
    ativo: true,
  },
  {
    code: "programa_anual",
    nome: "Programa Anual de Escala",
    precoRef: 40000,
    precoFundador: 30000, // condição Cliente Fundador (máx. 3)
    duracaoDias: 365,
    parcelamento: "anual",
    ativo: true,
  },
];
