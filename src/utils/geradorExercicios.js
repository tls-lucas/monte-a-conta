// src/utils/geradorExercicios.js
//
// Gerador centralizado de exercícios de aritmética, retornando objetos
// padronizados para serem exibidos e validados em qualquer tipo de fase.

function aleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function precisaReagrupamento(num1, num2, operacao) {
  if (operacao === 'soma') {
    const str1 = String(num1).split('').reverse();
    const str2 = String(num2).split('').reverse();
    for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
      if (parseInt(str1[i]) + parseInt(str2[i]) >= 10) return true;
    }
    return false;
  }
  if (operacao === 'subtracao') {
    const str1 = String(num1).split('').reverse();
    const str2 = String(num2).split('').reverse();
    for (let i = 0; i < str2.length; i++) {
      if (parseInt(str1[i] || 0) < parseInt(str2[i])) return true;
    }
    return false;
  }
  return false;
}

export function gerarExercicio(config) {
  const {
    tipo = 'soma',
    digitosMin = 1,
    digitosMax = 1,
    comReagrupamento = false,
    comResto = false,
  } = config;

  const numDigitos = aleatorio(digitosMin, digitosMax);
  const max = Math.pow(10, numDigitos) - 1;
  const min = digitosMin === 1 ? 1 : Math.pow(10, numDigitos - 1);

  let exercicio;

  if (tipo === 'soma') {
    let num1, num2;
    if (comReagrupamento) {
      do {
        num1 = aleatorio(min, max);
        num2 = aleatorio(min, max);
      } while (!precisaReagrupamento(num1, num2, 'soma'));
    } else {
      do {
        num1 = aleatorio(min, max);
        num2 = aleatorio(min, max);
      } while (precisaReagrupamento(num1, num2, 'soma'));
    }
    exercicio = {
      tipo: 'soma',
      numero1: num1,
      numero2: num2,
      operador: '+',
      resposta: num1 + num2,
    };
  } else if (tipo === 'subtracao') {
    let num1, num2;
    do {
      num1 = aleatorio(min, max);
      num2 = aleatorio(1, num1);
    } while (comReagrupamento !== precisaReagrupamento(num1, num2, 'subtracao'));
    exercicio = {
      tipo: 'subtracao',
      numero1: num1,
      numero2: num2,
      operador: '−',
      resposta: num1 - num2,
    };
  } else if (tipo === 'multiplicacao') {
    const num1 = aleatorio(Math.max(min, 10), Math.min(max, 999));
    const num2 = aleatorio(2, 9);
    exercicio = {
      tipo: 'multiplicacao',
      numero1: num1,
      numero2: num2,
      operador: '×',
      resposta: num1 * num2,
    };
  } else if (tipo === 'divisao') {
    let num1, num2, resposta, resto;
    const divisor = aleatorio(2, 9);

    if (comResto) {
      resposta = aleatorio(Math.max(min, 10), Math.min(max, 999));
      num1 = resposta * divisor + aleatorio(1, divisor - 1);
      num2 = divisor;
      resto = num1 % divisor;
    } else {
      resposta = aleatorio(Math.max(min, 10), Math.min(max, 999));
      num1 = resposta * divisor;
      num2 = divisor;
      resto = 0;
    }
    exercicio = {
      tipo: 'divisao',
      numero1: num1,
      numero2: num2,
      operador: '÷',
      resposta,
      resto,
    };
  }

  return exercicio;
}

export function gerarExerciciosBloco(ano, quantidadeMaxDigitos = 6) {
  const config = obterConfiguracaoAno(ano, quantidadeMaxDigitos);
  const exercicios = [];

  for (let i = 0; i < config.quantidade; i++) {
    const tipoOperacao = config.operacoes[i % config.operacoes.length];
    const parametros = config.parametrosPorTipo[tipoOperacao];
    exercicios.push(gerarExercicio({ tipo: tipoOperacao, ...parametros }));
  }

  return exercicios;
}

function obterConfiguracaoAno(ano, quantidadeMaxDigitos) {
  const configs = {
    1: {
      quantidade: 8,
      operacoes: ['soma', 'subtracao'],
      parametrosPorTipo: {
        soma: { digitosMin: 1, digitosMax: 2, comReagrupamento: false },
        subtracao: { digitosMin: 1, digitosMax: 2, comReagrupamento: false },
      },
    },
    2: {
      quantidade: 8,
      operacoes: ['soma', 'subtracao', 'multiplicacao'],
      parametrosPorTipo: {
        soma: { digitosMin: 2, digitosMax: 3, comReagrupamento: true },
        subtracao: { digitosMin: 2, digitosMax: 3, comReagrupamento: true },
        multiplicacao: { digitosMin: 1, digitosMax: 2 },
      },
    },
    3: {
      quantidade: 8,
      operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'],
      parametrosPorTipo: {
        soma: { digitosMin: 3, digitosMax: 4, comReagrupamento: true },
        subtracao: { digitosMin: 3, digitosMax: 4, comReagrupamento: true },
        multiplicacao: { digitosMin: 2, digitosMax: 3 },
        divisao: { digitosMin: 2, digitosMax: 3, comResto: false },
      },
    },
    4: {
      quantidade: 8,
      operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'],
      parametrosPorTipo: {
        soma: { digitosMin: 4, digitosMax: 5, comReagrupamento: true },
        subtracao: { digitosMin: 4, digitosMax: 5, comReagrupamento: true },
        multiplicacao: { digitosMin: 2, digitosMax: 3 },
        divisao: { digitosMin: 2, digitosMax: 3, comResto: true },
      },
    },
    5: {
      quantidade: 8,
      operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'],
      parametrosPorTipo: {
        soma: { digitosMin: 5, digitosMax: Math.min(6, quantidadeMaxDigitos), comReagrupamento: true },
        subtracao: { digitosMin: 5, digitosMax: Math.min(6, quantidadeMaxDigitos), comReagrupamento: true },
        multiplicacao: { digitosMin: 3, digitosMax: Math.min(4, quantidadeMaxDigitos) },
        divisao: { digitosMin: 3, digitosMax: Math.min(4, quantidadeMaxDigitos), comResto: true },
      },
    },
  };

  return configs[ano] || configs[1];
}

export function nomeAno(ano) {
  const nomes = { 1: '1º ano', 2: '2º ano', 3: '3º ano', 4: '4º ano', 5: '5º ano' };
  return nomes[ano] || `${ano}º ano`;
}
