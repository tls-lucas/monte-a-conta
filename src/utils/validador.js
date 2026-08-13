// Valida se uma sequência ordenada de blocos forma uma conta matematicamente correta.
// Não compara com uma sequência fixa — aceita qualquer ordenação que resulte
// numa equação válida (ex: "43+52=95" é tão válido quanto "52+43=95").

const OPERACOES = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b !== 0 ? a / b : NaN),
};

/**
 * Junta blocos de dígito vizinhos em números (ex: blocos "5" e "2" em sequência
 * viram o token "52"), mantendo operador e "=" como tokens separados.
 * @param {{tipo:string, valor:string}[]} pecasOrdenadas - blocos já ordenados da esquerda pra direita
 */
export function montarTokens(pecasOrdenadas) {
  const tokens = [];
  let numeroAtual = '';
  pecasOrdenadas.forEach((p) => {
    if (p.tipo === 'numero') {
      numeroAtual += p.valor;
    } else {
      if (numeroAtual) {
        tokens.push(numeroAtual);
        numeroAtual = '';
      }
      tokens.push(p.valor);
    }
  });
  if (numeroAtual) tokens.push(numeroAtual);
  return tokens;
}

/**
 * Checa se a sequência ordenada de blocos forma "numero operador numero = numero"
 * e se a conta bate matematicamente.
 * @param {{tipo:string, valor:string}[]} pecasOrdenadas
 * @returns {boolean}
 */
export function contaEstaCorreta(pecasOrdenadas) {
  const tokens = montarTokens(pecasOrdenadas);
  if (tokens.length !== 5) return false;

  const [aStr, operador, bStr, igual, resStr] = tokens;
  if (igual !== '=') return false;
  if (!/^\d+$/.test(aStr) || !/^\d+$/.test(bStr) || !/^\d+$/.test(resStr)) return false;

  const calcular = OPERACOES[operador];
  if (!calcular) return false;

  const a = Number(aStr);
  const b = Number(bStr);
  const resultado = Number(resStr);
  const valorCalculado = calcular(a, b);

  return Number.isFinite(valorCalculado) && valorCalculado === resultado;
}
