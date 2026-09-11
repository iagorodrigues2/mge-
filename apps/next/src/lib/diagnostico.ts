// Perguntas do diagnóstico público (/diagnostico). Vivem fora da rota porque
// a página (client) e a API (server) precisam da MESMA lista — se divergirem,
// a API rejeita a resposta que a própria página ofereceu.
import type { DiagnosticoRespostas } from "./types";

export const MOMENTOS = [
  "Ainda não vendo em marketplace",
  "Vendo, mas o resultado é fraco",
  "Vendo bem e quero escalar",
  "Sou fabricante/distribuidor e quero entrar do jeito certo",
] as const;

export const FATURAMENTOS = [
  "Até R$ 30 mil/mês",
  "R$ 30 a 100 mil/mês",
  "R$ 100 a 300 mil/mês",
  "R$ 300 mil a 1 milhão/mês",
  "Acima de R$ 1 milhão/mês",
] as const;

export const DORES = [
  "Não sei por onde começar",
  "Anúncio não vende / pouca visibilidade",
  "Margem some em taxa, frete e devolução",
  "Falta equipe ou processo pra operar",
  "Concorrente vende mais com produto pior",
] as const;

// Faturamento e momento decidem a rota. "Até 30 mil" + "ainda não vendo" é
// quem a Heat manda pro PDF de R$67 — aqui vai pro conteúdo do perfil, sem
// ocupar a máquina nem a agenda do Iago.
export function decidirRota(momento: string, faturamento: string): DiagnosticoRespostas["rota"] {
  const pequeno = faturamento === FATURAMENTOS[0];
  const naoVende = momento === MOMENTOS[0];
  return pequeno && naoVende ? "nutrir" : "prioritario";
}
