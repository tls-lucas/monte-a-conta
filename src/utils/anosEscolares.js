// Progressão do modo Conta Aritmética por ano escolar. Cada ano define quais
// TIPOS de exercício entram no sorteio de cada bloco — operações aritméticas
// (que viram gerarFase()), contagem de emojis (gerarFaseContagem()) e a fase
// de dinheiro (componente FaseDinheiro embutido) — e o nº máximo de
// algarismos por número nas contas.

export const EXERCICIOS_POR_BLOCO = 8;

export const ANOS = [
  {
    ano: 1,
    titulo: '1º Ano',
    descricao: 'Contagem, adição e subtração (até 99)',
    tipos: ['contagem', 'soma', 'subtracao'],
    maxDigitos: 2,
  },
  {
    ano: 2,
    titulo: '2º Ano',
    descricao: 'Tabuada e dinheiro (até 999)',
    tipos: ['soma', 'subtracao', 'multiplicacao', 'dinheiro'],
    maxDigitos: 3,
    dinheiro: { min: 5, max: 50 }, // valores baixos
  },
  {
    ano: 3,
    titulo: '3º Ano',
    descricao: 'Multiplicação, divisão e dinheiro (até 9.999)',
    tipos: ['soma', 'subtracao', 'multiplicacao', 'divisao', 'dinheiro'],
    maxDigitos: 4,
    // sem faixa própria: usa o intervalo padrão de notasGenerator.js
  },
  {
    ano: 4,
    titulo: '4º Ano',
    descricao: 'Operações complexas e dinheiro (até 99.999)',
    tipos: ['soma', 'subtracao', 'multiplicacao', 'divisao', 'dinheiro'],
    maxDigitos: 5,
    dinheiro: { min: 150, max: 600 }, // valores altos
  },
  {
    ano: 5,
    titulo: '5º Ano',
    descricao: 'Desafio máximo e dinheiro (até 999.999)',
    tipos: ['soma', 'subtracao', 'multiplicacao', 'divisao', 'dinheiro'],
    maxDigitos: 6,
    dinheiro: { min: 150, max: 600 }, // valores altos
  },
];

export function nomeAno(ano) {
  return ANOS.find((a) => a.ano === ano)?.titulo || `${ano}º ano`;
}

/**
 * Config do ano: tipos de exercício, teto de dígitos e faixa de valores da
 * fase de dinheiro (quando o ano inclui esse tipo). `tetoDigitos` vem das
 * preferências e serve de limite global, então baixá-lo alivia os anos mais
 * altos sem mexer nos outros.
 */
export function configDoAno(ano, tetoDigitos = 6) {
  const dados = ANOS.find((a) => a.ano === ano) || ANOS[0];
  return {
    tipos: dados.tipos,
    maxDigitos: Math.max(1, Math.min(dados.maxDigitos, tetoDigitos)),
    dinheiro: dados.dinheiro,
  };
}

/** Sorteia o tipo do próximo exercício do bloco, com igual chance entre os tipos do ano. */
export function sortearTipoExercicio(config) {
  const tipos = config.tipos;
  return tipos[Math.floor(Math.random() * tipos.length)];
}
