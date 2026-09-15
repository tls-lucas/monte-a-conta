// Progressão do modo Conta Aritmética por ano escolar. Cada ano define quais
// operações entram no sorteio e o nº máximo de algarismos por número — os dois
// parâmetros que gerarFase() já consome, então a fase em si continua sendo
// gerada pela mesma lógica das outras telas (algarismos soltos, sem conta alvo).

export const EXERCICIOS_POR_BLOCO = 8;

export const ANOS = [
  {
    ano: 1,
    titulo: '1º Ano',
    descricao: 'Adição e subtração (até 99)',
    operacoes: ['soma', 'subtracao'],
    maxDigitos: 2,
  },
  {
    ano: 2,
    titulo: '2º Ano',
    descricao: 'Tabuada e reagrupamento (até 999)',
    operacoes: ['soma', 'subtracao', 'multiplicacao'],
    maxDigitos: 3,
  },
  {
    ano: 3,
    titulo: '3º Ano',
    descricao: 'Multiplicação e divisão (até 9.999)',
    operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'],
    maxDigitos: 4,
  },
  {
    ano: 4,
    titulo: '4º Ano',
    descricao: 'Operações complexas (até 99.999)',
    operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'],
    maxDigitos: 5,
  },
  {
    ano: 5,
    titulo: '5º Ano',
    descricao: 'Desafio máximo (até 999.999)',
    operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'],
    maxDigitos: 6,
  },
];

export function nomeAno(ano) {
  return ANOS.find((a) => a.ano === ano)?.titulo || `${ano}º ano`;
}

/**
 * Config pronta pra gerarFase(). `tetoDigitos` vem das preferências e serve de
 * limite global, então baixá-lo alivia os anos mais altos sem mexer nos outros.
 */
export function configDoAno(ano, tetoDigitos = 6) {
  const dados = ANOS.find((a) => a.ano === ano) || ANOS[0];
  return {
    operacoes: dados.operacoes,
    maxDigitos: Math.max(1, Math.min(dados.maxDigitos, tetoDigitos)),
  };
}
