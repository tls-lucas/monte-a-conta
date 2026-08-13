// Registra o tempo de cada fase concluída, agrupado por operação e nível de
// dificuldade (nº máximo de dígitos: 1 a 4). Em vez de guardar a lista
// completa de tempos, guarda só { quantidade, media } por categoria, e
// atualiza a média de forma incremental a cada nova fase — sem precisar
// reprocessar o histórico inteiro. Persistido localmente como JSON via
// AsyncStorage (funciona em iOS, Android e web).

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_STORAGE = '@monte_a_conta:estatisticas';
export const OPERACOES_LISTA = ['soma', 'subtracao', 'multiplicacao', 'divisao'];
export const NIVEIS_LISTA = [1, 2, 3, 4];

function categoriaVazia() {
  return { quantidade: 0, media: 0 };
}

function estruturaVazia() {
  const estrutura = {};
  OPERACOES_LISTA.forEach((op) => {
    estrutura[op] = {};
    NIVEIS_LISTA.forEach((n) => {
      estrutura[op][n] = categoriaVazia();
    });
  });
  return estrutura;
}

/** Carrega o JSON salvo, preenchendo qualquer categoria faltante (ex: versão antiga do arquivo). */
export async function carregarEstatisticas() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_STORAGE);
    const completo = estruturaVazia();
    if (!bruto) return completo;
    const dados = JSON.parse(bruto);
    OPERACOES_LISTA.forEach((op) => {
      NIVEIS_LISTA.forEach((n) => {
        const cat = dados?.[op]?.[n];
        if (cat && typeof cat.quantidade === 'number' && typeof cat.media === 'number') {
          completo[op][n] = { quantidade: cat.quantidade, media: cat.media };
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
 */
export function calcularResumo(estatisticas) {
  const porCategoria = {};
  const porOperacao = {};

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

  return { porOperacao, porCategoria };
}
