// src/components/TrilhaAnos.js
//
// Seleção de ano (série) escolar em formato de trilha simples.
// Mostra 5 anos (1º-5º) com suas dificuldades progressivas.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useAparencia } from '../contexto/AparenciaContext';

const ANOS = [
  { ano: 1, titulo: '1º Ano', descricao: 'Soma e subtração (1 dígito)' },
  { ano: 2, titulo: '2º Ano', descricao: 'Soma e subtração (2 dígitos)' },
  { ano: 3, titulo: '3º Ano', descricao: 'Com multiplicação (2 dígitos)' },
  { ano: 4, titulo: '4º Ano', descricao: 'Com divisão (3 dígitos)' },
  { ano: 5, titulo: '5º Ano', descricao: 'Desafio completo (até 6 dígitos)' },
];

export default function TrilhaAnos({ onSelecionarAno, onVoltar }) {
  const { interface: coresInterface } = useAparencia();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={[styles.botaoVoltar, { color: coresInterface.textoSecundario }]}>← Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧮 Conta</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>Escolha seu ano escolar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.trilha}>
        {ANOS.map((item, index) => {
          const offsetX = Math.round(Math.sin((index * Math.PI) / 4) * 40);
          return (
            <View key={item.ano} style={[styles.linha, { marginLeft: offsetX }]}>
              <View style={styles.conector} />
              <TouchableOpacity
                style={[styles.node, { backgroundColor: coresInterface.botaoFaseContagem }]}
                onPress={() => onSelecionarAno(item.ano)}
              >
                <Text style={styles.nodeTexto}>{item.titulo}</Text>
                <Text style={styles.nodeDescricao}>{item.descricao}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  },
  linha: {
    marginBottom: 32,
    position: 'relative',
  },
  conector: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 54,
    marginBottom: -20,
  },
  node: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginLeft: 30,
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
  },
});
