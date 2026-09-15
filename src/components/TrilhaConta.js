// src/components/TrilhaConta.js
//
// Trilha de seleção de anos escolares (1º ao 5º) para o modo Conta Aritmética.
// Similar a TrilhaFases.js mas focada em progressão por ano em vez de
// operação × nível de dígitos.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useAparencia, misturarCores } from '../contexto/AparenciaContext';

const ANOS = [
  { ano: 1, titulo: '1º Ano', descricao: 'Adição e subtração (até 99)' },
  { ano: 2, titulo: '2º Ano', descricao: 'Tabuada e reagrupamento (até 999)' },
  { ano: 3, titulo: '3º Ano', descricao: 'Multiplicação e divisão (até 9.999)' },
  { ano: 4, titulo: '4º Ano', descricao: 'Operações complexas (até 99.999)' },
  { ano: 5, titulo: '5º Ano', descricao: 'Desafio máximo (até 999.999)' },
];

function obterStatusAno(estatisticas, ano) {
  const dados = estatisticas?.[`conta_ano_${ano}`];
  if (!dados || dados.quantidade === 0) return 'bloqueada';
  return 'completa';
}

export default function TrilhaConta({ estatisticas, onSelecionarAno, onVoltar, inline = false }) {
  const { interface: coresInterface, cores } = useAparencia();

  // cada ano recebe um ponto da paleta atual, do tom mais claro (1º) ao
  // mais forte (5º), então a trilha acompanha o esquema de cores escolhido
  const corDoAno = (indice) =>
    misturarCores(cores.igual, cores.numero, indice / (ANOS.length - 1));

  if (inline) {
    return (
      <View style={styles.trilhaInline}>
        <Text style={[styles.trilhaInlineTitulo, { color: coresInterface.textoPrincipal }]}>🧮 Conta Aritmética</Text>
        <View style={styles.trilhaInlineConteudo}>
          {ANOS.map((item, index) => {
            const status = obterStatusAno(estatisticas, item.ano);

            return (
              <TouchableOpacity
                key={item.ano}
                style={[
                  styles.nodeInline,
                  { backgroundColor: corDoAno(index) },
                  status === 'completa' && styles.nodeInlineCompleto,
                ]}
                onPress={() => onSelecionarAno(item.ano)}
              >
                <Text style={styles.nodeInlineTexto}>{item.titulo}</Text>
                <Text style={styles.nodeInlineDescricao}>{item.descricao}</Text>
                {status === 'completa' && <Text style={styles.nodeBadge}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={[styles.botaoVoltar, { color: coresInterface.textoSecundario }]}>← Menu</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧮 Conta Aritmética</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>Escolha seu ano escolar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.trilha, { backgroundColor: coresInterface.fundoTela }]}>
        {ANOS.map((item, index) => {
          const offsetX = Math.round(Math.sin((index * Math.PI) / 4) * 50);
          const status = obterStatusAno(estatisticas, item.ano);
          const bloqueada = false;

          return (
            <View key={item.ano} style={[styles.linha, { marginLeft: offsetX }]}>
              {index < ANOS.length - 1 && <View style={styles.conector} />}
              <TouchableOpacity
                style={[
                  styles.node,
                  { backgroundColor: corDoAno(index) },
                  status === 'completa' && styles.nodeCompleto,
                ]}
                onPress={() => onSelecionarAno(item.ano)}
                disabled={bloqueada}
              >
                <Text style={styles.nodeTexto}>{item.titulo}</Text>
                <Text style={styles.nodeDescricao}>{item.descricao}</Text>
                {status === 'completa' && <Text style={styles.nodeBadge}>✓</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  trilhaInline: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  trilhaInlineTitulo: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  trilhaInlineConteudo: {
    gap: 6,
  },
  nodeInline: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    position: 'relative',
  },
  nodeInlineCompleto: {
    opacity: 0.85,
  },
  nodeInlineTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  nodeInlineDescricao: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
  container: {
    flex: 1,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  botaoVoltar: {
    fontSize: 16,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitulo: {
    fontSize: 12,
  },
  trilha: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  linha: {
    marginBottom: 28,
    position: 'relative',
  },
  conector: {
    width: 2,
    height: 20,
    backgroundColor: '#ccc',
    marginLeft: 54,
    marginBottom: -20,
  },
  node: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginLeft: 30,
    position: 'relative',
  },
  nodeCompleto: {
    opacity: 0.85,
  },
  nodeTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nodeDescricao: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  nodeBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    color: '#fff',
    fontSize: 18,
  },
});
