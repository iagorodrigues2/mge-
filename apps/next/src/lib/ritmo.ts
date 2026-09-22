// Ritmo humano de resposta.
//
// A IA respondia em 3 segundos com 600 caracteres — e isso, mais que qualquer
// frase, entrega que não há ninguém do outro lado. Pessoa lê, pensa, digita.
// Este módulo só calcula: quanto esperar e em quantos balões quebrar. Quem
// espera e envia é o webhook.
//
// Pura de propósito (sem I/O) para dar pra testar sem servidor.

export interface Balao {
  texto: string;
  esperaMs: number; // antes de ENVIAR este balão (tempo "digitando")
}

// Velocidade de quem digita no celular com prática, mais um respiro para "ler"
// o que o lead mandou. TETO_TOTAL_MS é o alvo do tempo TOTAL de espera do lead
// (o que a IA já gastou conta dentro dele) — 13s, não 22s: parecer humano vale
// menos que o lead continuar na conversa, e com modelo lento a soma dos dois
// ainda arriscava estourar o limite de 60s da função.
const RESPIRO_MS = 1500;
const MS_POR_CHAR = 26;
const TETO_BALAO_MS = 5500;
const TETO_TOTAL_MS = 13000;
const MAX_BALOES = 3;

// O modelo escreve em markdown por hábito; o WhatsApp não é markdown. "**x**"
// aparece com os asteriscos, "---" vira uma linha de traços no meio do balão,
// e "### Título" mostra as cerquilhas. Converter aqui é determinístico —
// pedir no prompt ajuda, mas não garante.
export function formatarParaWhatsApp(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "*$1*") // negrito markdown -> negrito WhatsApp
    .replace(/__(.+?)__/g, "_$1_") // itálico
    .replace(/^#{1,6}\s+/gm, "") // títulos
    .replace(/^\s*(-{3,}|_{3,}|\*{3,})\s*$/gm, "") // separadores
    .replace(/^\s*[-•]\s+/gm, "• ") // marcadores uniformes
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function planejarBaloes(
  textoBruto: string,
  opts: { maxBaloes?: number; jaGastouMs?: number } = {},
): Balao[] {
  const max = opts.maxBaloes ?? MAX_BALOES;
  const texto = formatarParaWhatsApp(textoBruto);
  const partes = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Mais parágrafos que balões: os excedentes se juntam ao último. Uma lista
  // de catálogo, por exemplo, chega em um balão só — quebrá-la em cinco
  // pedaços seria pior de ler que a parede de texto.
  const baloes: string[] = partes.slice(0, max);
  if (partes.length > max) baloes[max - 1] = [baloes[max - 1], ...partes.slice(max)].join("\n\n");
  if (baloes.length === 0) baloes.push(texto.trim());

  // O TEMPO QUE A IA JÁ LEVOU CONTA COMO ESPERA. O lead não sabe se a demora
  // foi o modelo pensando ou alguém digitando — ele só sabe que esperou. Somar
  // 22s de "ritmo humano" em cima de 15s de modelo lento não humaniza nada:
  // irrita o lead e ainda arrisca estourar o limite da função.
  let restante = Math.max(TETO_TOTAL_MS - (opts.jaGastouMs ?? 0), 0);
  return baloes.map((t, i) => {
    // O primeiro balão carrega o "respiro" de leitura; os seguintes só o tempo
    // de digitar, já que a pessoa já está com o celular na mão.
    const bruto = (i === 0 ? RESPIRO_MS : 600) + t.length * MS_POR_CHAR;
    const espera = Math.min(bruto, TETO_BALAO_MS, Math.max(restante, 0));
    restante -= espera;
    return { texto: t, esperaMs: espera };
  });
}

export const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
