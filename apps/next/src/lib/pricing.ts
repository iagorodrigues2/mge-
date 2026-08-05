// Regras de parcelamento e formatação de preço (seção 3.4).
import type { Installment, ServicePackage } from "./types";

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Molde de condição de pagamento textual (para a proposta).
export function condicaoPagamento(pkg: ServicePackage): string {
  switch (pkg.parcelamento) {
    case "projeto_90":
      return "50% na assinatura, 25% em 30 dias e 25% em 60 dias.";
    case "anual":
      return "Entrada de implantação na assinatura + saldo mensal ao longo de 12 meses.";
    default:
      return "Pagamento único na contratação.";
  }
}

// Gera as parcelas do negócio a partir do pacote e do valor negociado.
export function buildInstallments(pkg: ServicePackage, valor: number, from = new Date()): Installment[] {
  if (pkg.parcelamento === "projeto_90") {
    return [
      { n: 1, label: "Entrada (50%)", valor: Math.round(valor * 0.5), dueDate: addDays(from, 0), status: "pendente" },
      { n: 2, label: "Parcela 2 (25%)", valor: Math.round(valor * 0.25), dueDate: addDays(from, 30), status: "pendente" },
      { n: 3, label: "Parcela 3 (25%)", valor: valor - Math.round(valor * 0.5) - Math.round(valor * 0.25), dueDate: addDays(from, 60), status: "pendente" },
    ];
  }
  if (pkg.parcelamento === "anual") {
    const entrada = Math.round(valor * 0.25);
    const saldo = valor - entrada;
    const mensal = Math.round(saldo / 11);
    const parcelas: Installment[] = [
      { n: 1, label: "Entrada de implantação", valor: entrada, dueDate: addDays(from, 0), status: "pendente" },
    ];
    let acumulado = entrada;
    for (let i = 1; i <= 11; i++) {
      const isLast = i === 11;
      const v = isLast ? valor - acumulado : mensal;
      acumulado += v;
      parcelas.push({ n: i + 1, label: `Mensalidade ${i}/11`, valor: v, dueDate: addDays(from, 30 * i), status: "pendente" });
    }
    return parcelas;
  }
  return [{ n: 1, label: "Pagamento único", valor, dueDate: addDays(from, 0), status: "pendente" }];
}
