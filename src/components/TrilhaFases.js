// src/components/TrilhaFases.js
//
// Menu de seleção de fases em formato de trilha vertical (estilo Duolingo),
// mas simplificado: 1 caminho único com os 16 nós (4 operações x 4 níveis
// de dígitos), sem libs externas (só View/Text/TouchableOpacity/ScrollView).
//
// Regra de desbloqueio: um nó está completo se `quantidade > 0` na
// categoria correspondente (dado que já vem de estatisticas.js). O primeiro
// nó ainda não completo fica "atual" (jogável, destacado). Todo o resto
// depois dele fica bloqueado.
//
// Uso em App.js:
//
//   import TrilhaFases from './src/components/TrilhaFases';
//   import { carregarEstatisticas } from './src/utils/estatisticas'; // ajuste o nome real
//
//   <TrilhaFases
//     estatisticas={estatisticas} // objeto no formato descrito acima
//     onSelecionarFase={(operacao, nivel) => {
//       // ex: iniciarFase({ operacoesHabilitadas: [operacao], maxDigitos: nivel })
//     }}
//   />

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const OPERACOES = [
  { key: 'soma', simbolo: '+', nome: 'Adição' },
  { key: 'subtracao', simbolo: '−', nome: 'Subtração' },
  { key: 'multiplicacao', simbolo: '×', nome: 'Multiplicação' },
  { key: 'divisao', simbolo: '÷', nome: 'Divisão' },
];

const NIVEIS = [1, 2, 3, 4];

function montarFases() {
  const fases = [];
  OPERACOES.forEach((op) => {
    NIVEIS.forEach((nivel) => {
      fases.push({ operacao: op.key, simbolo: op.simbolo, nome: op.nome, nivel });
    });
  });
  return fases;
}

const FASES = montarFases();

function obterStatusFases(estatisticas) {
  let jaEncontrouAtual = false;
  return FASES.map((fase) => {
    const dados = estatisticas?.[fase.operacao]?.[fase.nivel];
    const completa = !!dados && dados.quantidade > 0;

    let status = 'bloqueada';
    if (completa) {
      status = 'completa';
    } else if (!jaEncontrouAtual) {
      status = 'atual';
      jaEncontrouAtual = true;
    }
    return { ...fase, status };
  });
}

export default function TrilhaFases({ estatisticas, onSelecionarFase }) {
  const fasesComStatus = obterStatusFases(estatisticas);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {fasesComStatus.map((fase, index) => {
        const ehPrimeiroDaOperacao = fase.nivel === 1;
        const offsetX = Math.round(Math.sin((index * Math.PI) / 4) * 70);
        const bloqueada = fase.status === 'bloqueada';
        const completa = fase.status === 'completa';
        const atual = fase.status === 'atual';

        return (
          <View key={`${fase.operacao}-${fase.nivel}`} style={styles.linha}>
            {ehPrimeiroDaOperacao && (
              <Text style={styles.tituloOperacao}>{fase.nome}</Text>
            )}

            <View style={[styles.noWrapper, { transform: [{ translateX: offsetX }] }]}>
              <TouchableOpacity
                disabled={bloqueada}
                onPress={() => onSelecionarFase(fase.operacao, fase.nivel)}
                style={[
                  styles.no,
                  completa && styles.noCompleta,
                  atual && styles.noAtual,
                  bloqueada && styles.noBloqueada,
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.simbolo, bloqueada && styles.textoBloqueado]}>
                  {bloqueada ? '🔒' : fase.simbolo}
                </Text>
                <Text style={[styles.nivelTexto, bloqueada && styles.textoBloqueado]}>
                  {fase.nivel} dígito{fase.nivel > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>

              {completa && (
                <View style={styles.selo}>
                  <Text style={styles.seloTexto}>✓</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const CORES = {
  fundo: '#1f2937',
  completa: '#22c55e',
  atual: '#3b82f6',
  bloqueada: '#4b5563',
  texto: '#f9fafb',
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  linha: {
    alignItems: 'center',
    marginBottom: 8,
  },
  tituloOperacao: {
    color: CORES.texto,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  noWrapper: {
    position: 'relative',
  },
  no: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: CORES.atual,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  noCompleta: {
    backgroundColor: CORES.completa,
  },
  noAtual: {
    borderWidth: 3,
    borderColor: '#93c5fd',
  },
  noBloqueada: {
    backgroundColor: CORES.bloqueada,
  },
  simbolo: {
    color: CORES.texto,
    fontSize: 22,
    fontWeight: '700',
  },
  nivelTexto: {
    color: CORES.texto,
    fontSize: 10,
    marginTop: 2,
  },
  textoBloqueado: {
    color: '#9ca3af',
  },
  selo: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CORES.fundo,
  },
  seloTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
