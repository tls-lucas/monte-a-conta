// Registra o tempo de cada fase concluída. As contas são agrupadas por
// operação e nível de dificuldade (nº máximo de dígitos: 1 a 6); as fases de
// dinheiro e de contagem não têm níveis e gravam num nível só. Em vez de
// guardar a lista completa de tempos, guarda só { quantidade, media } por
// categoria, e atualiza a média de forma incremental a cada nova fase — sem
// precisar reprocessar o histórico inteiro. Persistido localmente como JSON
// via AsyncStorage (funciona em iOS, Android e web).

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_STORAGE = '@monte_a_conta:estatisticas';
export const OPERACOES_LISTA = ['soma', 'subtracao', 'multiplicacao', 'divisao'];
export const NIVEIS_LISTA = [1, 2, 3, 4, 5, 6];

// Modos que não se dividem por nº de dígitos: gravam tudo no nível 1.
export const NIVEL_UNICO = 1;

export const MODOS_LISTA = [
  { chave: 'dinheiro', rotulo: 'Fase de dinheiro', icone: 'cash-multiple' },
  { chave: 'contagem', rotulo: 'Fase de contagem', icone: 'numeric' },
];

function categoriaVazia() {
  return { quantidade: 0, media: 0 };
}

function ehCategoriaValida(cat) {
  return (
    cat &&
    typeof cat.quantidade === 'number' &&
    typeof cat.media === 'number' &&
    Number.isFinite(cat.quantidade) &&
    Number.isFinite(cat.media)
  );
}

function estruturaVazia() {
  const estrutura = {};
  OPERACOES_LISTA.forEach((op) => {
    estrutura[op] = {};
    NIVEIS_LISTA.forEach((n) => {
      estrutura[op][n] = categoriaVazia();
    });
  });
  MODOS_LISTA.forEach((modo) => {
    estrutura[modo.chave] = { [NIVEL_UNICO]: categoriaVazia() };
  });
  return estrutura;
}

/**
 * Carrega o JSON salvo, garantindo que toda categoria conhecida exista. Copia
 * qualquer chave presente no arquivo, mesmo fora das listas — filtrar aqui é o
 * que fazia os modos novos serem descartados a cada leitura, zerando o
 * histórico deles a cada registro.
 */
export async function carregarEstatisticas() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_STORAGE);
    const completo = estruturaVazia();
    if (!bruto) return completo;

    const dados = JSON.parse(bruto);
    Object.keys(dados || {}).forEach((categoria) => {
      const niveis = dados[categoria];
      if (!niveis || typeof niveis !== 'object') return;
      if (!completo[categoria]) completo[categoria] = {};
      Object.keys(niveis).forEach((nivel) => {
        const cat = niveis[nivel];
        if (ehCategoriaValida(cat)) {
          completo[categoria][nivel] = { quantidade: cat.quantidade, media: cat.media };
        }
      });
    });
    return completo;
  } catch (e) {
    return estruturaVazia();
  }
}

/**
 * Registra um novo tempo (em segundos) na categoria operação + nível de dígitos,
 * recalculando a média incrementalmente a partir da quantidade de fases já
 * usadas nessa categoria: novaMedia = mediaAtual + (novoTempo - mediaAtual) / novaQuantidade.
 */
export async function registrarTempo(operacao, maxDigitos, segundos) {
  const estatisticas = await carregarEstatisticas();
  if (!estatisticas[operacao]) estatisticas[operacao] = {};
  const categoriaAtual = estatisticas[operacao][maxDigitos] || categoriaVazia();

  const novaQuantidade = categoriaAtual.quantidade + 1;
  const novaMedia = categoriaAtual.media + (segundos - categoriaAtual.media) / novaQuantidade;

  estatisticas[operacao][maxDigitos] = { quantidade: novaQuantidade, media: novaMedia };
  await AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(estatisticas));
  return estatisticas;
}

/** Apaga todo o histórico salvo. */
export async function limparEstatisticas() {
  await AsyncStorage.removeItem(CHAVE_STORAGE);
  return estruturaVazia();
}

/**
 * A partir do JSON bruto, calcula:
 * - porCategoria: média e quantidade de fases por operação + nível de dígitos (dado direto)
 * - porOperacao: média geral (ponderada pela quantidade de cada nível) e quantidade total da operação
 * - porModo: média e quantidade dos modos de nível único (dinheiro e contagem)
 */
export function calcularResumo(estatisticas) {
  const porCategoria = {};
  const porOperacao = {};
  const porModo = {};

  OPERACOES_LISTA.forEach((op) => {
    porCategoria[op] = {};
    let quantidadeTotal = 0;
    let somaPonderada = 0;

    NIVEIS_LISTA.forEach((n) => {
      const cat = estatisticas?.[op]?.[n] || categoriaVazia();
      porCategoria[op][n] = { media: cat.quantidade > 0 ? cat.media : null, quantidade: cat.quantidade };
      quantidadeTotal += cat.quantidade;
      somaPonderada += cat.media * cat.quantidade;
    });

    porOperacao[op] = {
      media: quantidadeTotal > 0 ? somaPonderada / quantidadeTotal : null,
      quantidade: quantidadeTotal,
    };
  });

  MODOS_LISTA.forEach((modo) => {
    const cat = estatisticas?.[modo.chave]?.[NIVEL_UNICO] || categoriaVazia();
    porModo[modo.chave] = {
      media: cat.quantidade > 0 ? cat.media : null,
      quantidade: cat.quantidade,
    };
  });

  return { porOperacao, porCategoria, porModo };
}
