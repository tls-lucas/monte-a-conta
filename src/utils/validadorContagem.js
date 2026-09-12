// src/utils/validadorContagem.js
//
// Validação da fase de contagem: mesma filosofia do validador.js original
// (ordena peças pela posição X, aceita qualquer arranjo que resulte numa
// conta correta) — mas o "valor" de um grupo de peças vizinhas vem da
// CONTAGEM de peças de emoji contíguas, não da concatenação de dígitos,
// já que aqui cada peça vale exatamente 1.

const OPERACOES = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
};

/**
 * Agrupa peças vizinhas em tokens: peças de emoji viram uma contagem
 * (nº de peças do grupo), peças de dígito ('numero') são concatenadas
 * como número (igual ao validador.js das fases de conta), e operador/"="
 * seguem como tokens literais.
 * @param {{tipo:string, valor:string}[]} pecasOrdenadas - peças já ordenadas da esquerda pra direita
 */
export function montarTokensContagem(pecasOrdenadas) {
  const tokens = [];
  let contagemEmoji = 0;
  let digitosNumero = '';

  function fecharEmoji() {
    if (contagemEmoji > 0) {
      tokens.push(contagemEmoji);
      contagemEmoji = 0;
    }
  }
  function fecharNumero() {
    if (digitosNumero) {
      tokens.push(Number(digitosNumero));
      digitosNumero = '';
    }
  }

  pecasOrdenadas.forEach((p) => {
    if (p.tipo === 'emoji') {
      fecharNumero();
      contagemEmoji += 1;
    } else if (p.tipo === 'numero') {
      fecharEmoji();
      digitosNumero += p.valor;
    } else {
      fecharEmoji();
      fecharNumero();
      tokens.push(p.valor);
    }
  });
  fecharEmoji();
  fecharNumero();

  return tokens;
}

/**
 * Valida uma fase com operador (soma/subtração): espera a sequência
 * [quantidade, operador, quantidade, "=", quantidade] E que os valores
 * batam exatamente com a conta alvo pré-definida — não basta a conta ser
 * matematicamente válida em algum arranjo, porque como cada peça vale 1,
 * qualquer divisão das peças em dois grupos que some o total correto
 * também "bateria" na soma (ex: 1+3=4 quando o alvo era 2+2=4).
 * @param {{tipo:string, valor:string}[]} pecasOrdenadas
 * @param {{a:number, b:number, resultado:number}} contaAlvo
 * @returns {boolean}
 */
export function contagemComOperadorEstaCorreta(pecasOrdenadas, contaAlvo) {
  const tokens = montarTokensContagem(pecasOrdenadas);
  if (tokens.length !== 5) return false;

  const [a, operador, b, igual, resultado] = tokens;
  if (igual !== '=') return false;
  if (typeof a !== 'number' || typeof b !== 'number' || typeof resultado !== 'number') return false;

  const calcular = OPERACOES[operador];
  if (!calcular) return false;
  if (calcular(a, b) !== resultado) return false;

  return a === contaAlvo.a && b === contaAlvo.b && resultado === contaAlvo.resultado;
}

/**
 * Valida a fase sem operador à esquerda: espera a sequência
 * [quantidade, "=", valor-alvo em algarismos].
 * @param {{tipo:string, valor:string}[]} pecasOrdenadas
 * @param {number} valorAlvo
 * @returns {boolean}
 */
export function contagemSimplesEstaCorreta(pecasOrdenadas, valorAlvo) {
  const tokens = montarTokensContagem(pecasOrdenadas);
  if (tokens.length !== 3) return false;

  const [quantidade, igual, valor] = tokens;
  if (igual !== '=') return false;
  if (typeof quantidade !== 'number' || typeof valor !== 'number') return false;

  return quantidade === valor && valor === valorAlvo;
}
