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

// Velocidade de quem digita no celular com prática: ~6 caracteres/segundo,
// mais um respiro fixo para "ler" o que o lead mandou. Teto por balão para a
// conversa não virar novela, e teto total para caber na função serverless
// (a IA já gastou uns 10s antes de chegar aqui).
const RESPIRO_MS = 1800;
const MS_POR_CHAR = 38;
const TETO_BALAO_MS = 9000;
const TETO_TOTAL_MS = 22000;
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

export function planejarBaloes(textoBruto: string, opts: { maxBaloes?: number } = {}): Balao[] {
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

  let restante = TETO_TOTAL_MS;
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
