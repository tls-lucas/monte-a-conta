// Gera fases (contas) respeitando as operações habilitadas e o nº máximo de dígitos.
// Cada NÚMERO é quebrado em blocos individuais (um por algarismo) — o número
// não é um bloco de texto único, é uma sequência de blocos que precisam ficar
// lado a lado, na ordem certa, junto com o operador e o "=".

const SIMBOLOS = {
  soma: '+',
  subtracao: '-',
  multiplicacao: '×',
  divisao: '÷',
};

function numeroAleatorio(maxDigitos) {
  const digitos = 1 + Math.floor(Math.random() * maxDigitos);
  const min = digitos === 1 ? 1 : Math.pow(10, digitos - 1);
  const max = Math.pow(10, digitos) - 1;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function limiteDigitos(maxDigitos) {
  return Math.pow(10, maxDigitos) - 1;
}

function gerarSoma(maxDigitos) {
  const a = numeroAleatorio(maxDigitos);
  const limite = limiteDigitos(maxDigitos);
  let b = numeroAleatorio(maxDigitos);
  let tentativas = 0;
  while (a + b > limite && tentativas < 30) {
    b = numeroAleatorio(maxDigitos);
    tentativas++;
  }
  return { a, b, resultado: a + b };
}

function gerarSubtracao(maxDigitos) {
  let a = numeroAleatorio(maxDigitos);
  let b = numeroAleatorio(maxDigitos);
  if (b > a) [a, b] = [b, a]; // evita resultado negativo
  return { a, b, resultado: a - b };
}

function gerarMultiplicacao(maxDigitos) {
  const digitosFatorB = Math.min(maxDigitos, 2);
  const limite = limiteDigitos(maxDigitos);
  let a = numeroAleatorio(maxDigitos);
  let b = numeroAleatorio(digitosFatorB);
  let tentativas = 0;
  while (a * b > limite && tentativas < 30) {
    a = numeroAleatorio(maxDigitos);
    b = numeroAleatorio(digitosFatorB);
    tentativas++;
  }
  return { a, b, resultado: a * b };
}

function gerarDivisao(maxDigitos) {
  const limite = limiteDigitos(maxDigitos);
  const digitosB = Math.min(maxDigitos, 2);
  let tentativas = 0;
  let b, resultado, a;
  do {
    b = numeroAleatorio(digitosB) || 1;
    resultado = numeroAleatorio(maxDigitos);
    a = b * resultado;
    tentativas++;
  } while ((a > limite || b === 0) && tentativas < 50);
  return { a, b, resultado };
}

const GERADORES = {
  soma: gerarSoma,
  subtracao: gerarSubtracao,
  multiplicacao: gerarMultiplicacao,
  divisao: gerarDivisao,
};

// quebra um número em blocos individuais: 24 -> [{tipo:'numero', valor:'2'}, {tipo:'numero', valor:'4'}]
function blocosDoNumero(numero, prefixoId) {
  return String(numero)
    .split('')
    .map((digito, i) => ({ id: `${prefixoId}-${i}`, tipo: 'numero', valor: digito }));
}

/**
 * Gera uma nova fase.
 * @param {Object} config
 * @param {string[]} config.operacoes
 * @param {number} config.maxDigitos - de 1 a 4
 * @returns {{ pecas: {id:string, tipo:string, valor:string}[], sequenciaCorreta: string[], operacao: string, maxDigitos: number }}
 */
export function gerarFase(config) {
  const operacoesValidas =
    config.operacoes && config.operacoes.length > 0 ? config.operacoes : ['soma'];
  const maxDigitos = Math.min(4, Math.max(1, config.maxDigitos || 1));

  const opEscolhida =
    operacoesValidas[Math.floor(Math.random() * operacoesValidas.length)];
  const gerar = GERADORES[opEscolhida] || gerarSoma;
  const { a, b, resultado } = gerar(maxDigitos);
  const simbolo = SIMBOLOS[opEscolhida];

  const pecas = [
    ...blocosDoNumero(a, 'a'),
    { id: 'op', tipo: 'operador', valor: simbolo },
    ...blocosDoNumero(b, 'b'),
    { id: 'igual', tipo: 'igual', valor: '=' },
    ...blocosDoNumero(resultado, 'r'),
  ];

  return {
    pecas,
    sequenciaCorreta: pecas.map((p) => p.valor),
    operacao: opEscolhida,
    maxDigitos,
  };
}

export const OPERACOES_DISPONIVEIS = [
  { chave: 'soma', rotulo: 'Soma', simbolo: '+' },
  { chave: 'subtracao', rotulo: 'Subtração', simbolo: '-' },
  { chave: 'multiplicacao', rotulo: 'Multiplicação', simbolo: '×' },
  { chave: 'divisao', rotulo: 'Divisão', simbolo: '÷' },
];
