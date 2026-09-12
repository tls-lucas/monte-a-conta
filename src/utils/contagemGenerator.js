// src/utils/contagemGenerator.js
//
// Gera uma fase do módulo de contagem: sorteia o tema (letra + emoji),
// sorteia a operação (soma, subtração ou nenhuma) e monta as peças
// unárias correspondentes — cada peça vale exatamente 1, então um
// operando de valor N é representado por N peças soltas do mesmo emoji.

import { sortearTema } from "./emojiTema";

const OPERACOES = ["soma", "subtracao", "nenhuma"];
const VALOR_MAXIMO = 9;
const B_MAXIMO_SUBTRACAO = 5; // evita operandos gigantes de peças na tela

function blocosDeEmoji(quantidade, emoji, prefixoId) {
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `${prefixoId}-${i}`,
    tipo: "emoji",
    valor: emoji,
  }));
}

// quebra o resultado em blocos de dígito — igual ao faseGenerator.js das
// fases de conta normais, já que o resultado da contagem deve aparecer em
// algarismos (ex: 🔥🔥+🔥🔥🔥=5), não como mais blocos de emoji
function blocosDoNumero(numero, prefixoId) {
  return String(numero)
    .split("")
    .map((digito, i) => ({
      id: `${prefixoId}-${i}`,
      tipo: "numero",
      valor: digito,
    }));
}

// resultado sorteado entre 2 e 15; a e b são as duas partes em que ele é
// quebrado (ambas sempre >= 1)
function gerarSoma(emoji) {
  const resultado = 2 + Math.floor(Math.random() * (VALOR_MAXIMO - 1));
  const a = 1 + Math.floor(Math.random() * (resultado - 1));
  const b = resultado - a;
  return {
    a,
    b,
    resultado,
    pecas: [
      ...blocosDeEmoji(a, emoji, "a"),
      { id: "op", tipo: "operador", valor: "+" },
      ...blocosDeEmoji(b, emoji, "b"),
      { id: "igual", tipo: "igual", valor: "=" },
      ...blocosDoNumero(resultado, "r"),
    ],
  };
}

// resultado sorteado entre 1 e 15; b (capado em 1-10) é somado ao
// resultado pra formar a: a - b = resultado
function gerarSubtracao(emoji) {
  const resultado = 1 + Math.floor(Math.random() * VALOR_MAXIMO);
  const b = 1 + Math.floor(Math.random() * B_MAXIMO_SUBTRACAO);
  const a = resultado + b;
  return {
    a,
    b,
    resultado,
    pecas: [
      ...blocosDeEmoji(a, emoji, "a"),
      { id: "op", tipo: "operador", valor: "-" },
      ...blocosDeEmoji(b, emoji, "b"),
      { id: "igual", tipo: "igual", valor: "=" },
      ...blocosDoNumero(resultado, "r"),
    ],
  };
}

// sem operador à esquerda: só o grupo de emojis, seguido de "=" e o
// valor-alvo em algarismos (ex: 🔥🔥🔥=3)
function gerarNenhuma(emoji) {
  const resultado = 1 + Math.floor(Math.random() * VALOR_MAXIMO);
  return {
    resultado,
    pecas: [
      ...blocosDeEmoji(resultado, emoji, "n"),
      { id: "igual", tipo: "igual", valor: "=" },
      ...blocosDoNumero(resultado, "r"),
    ],
  };
}

const GERADORES = {
  soma: gerarSoma,
  subtracao: gerarSubtracao,
  nenhuma: gerarNenhuma,
};

/**
 * Gera uma nova fase de contagem.
 * @returns {{ pecas: object[], operacao: string, resultado: number, emoji: string, letra: string }}
 */
export function gerarFaseContagem() {
  const tema = sortearTema();
  const operacao = OPERACOES[Math.floor(Math.random() * OPERACOES.length)];
  const { resultado, pecas, a, b } = GERADORES[operacao](tema.emoji);
  return {
    pecas,
    operacao,
    resultado,
    a,
    b,
    emoji: tema.emoji,
    nomeEmoji: tema.nome,
    letra: tema.letra,
  };
}

export const OPERACOES_CONTAGEM = OPERACOES;
