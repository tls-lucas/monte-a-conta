// src/utils/notasGenerator.js
//
// Gera o valor-alvo da fase de cédulas. O valor-alvo é sempre a soma de
// algumas cédulas sorteadas (2 a 5 delas) — isso garante, por construção,
// que sempre existe pelo menos uma combinação exata de cédulas que alcança
// o valor (mesmo que o jogador chegue lá por um caminho diferente, o que
// é aceito, igual acontece na validação das contas normais).

export const NOTAS_DISPONIVEIS = [2, 5, 10, 20, 50, 100, 200];

const VALOR_MINIMO = 10;
const VALOR_MAXIMO = 300;
const QTD_MIN_NOTAS = 2;
const QTD_MAX_NOTAS = 5;

function notaAleatoria() {
  return NOTAS_DISPONIVEIS[Math.floor(Math.random() * NOTAS_DISPONIVEIS.length)];
}

/**
 * Sorteia um valor-alvo dentro da faixa [min, max] (padrão: a faixa geral do
 * jogo). Usado também pelos blocos por ano pra pedir valores "baixos" ou
 * "altos" conforme a série, sem duplicar a lógica de sorteio de notas.
 * @returns {number}
 */
export function gerarValorAlvo(min = VALOR_MINIMO, max = VALOR_MAXIMO) {
  let soma = 0;
  let tentativas = 0;
  do {
    const qtd = QTD_MIN_NOTAS + Math.floor(Math.random() * (QTD_MAX_NOTAS - QTD_MIN_NOTAS + 1));
    soma = 0;
    for (let i = 0; i < qtd; i++) soma += notaAleatoria();
    tentativas++;
  } while ((soma < min || soma > max) && tentativas < 50);
  return soma;
}
