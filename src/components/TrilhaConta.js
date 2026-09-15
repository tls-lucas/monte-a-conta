// src/components/TrilhaConta.js
//
// Lista de anos escolares (1º ao 5º) do modo Conta Aritmética, exibida direto
// no menu. Cada ano abre um bloco de contas com as operações e o nº de
// algarismos daquele nível.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAparencia, misturarCores } from '../contexto/AparenciaContext';
import { ANOS } from '../utils/anosEscolares';

export default function TrilhaConta({ onSelecionarAno }) {
  const { interface: coresInterface, cores } = useAparencia();

  // cada ano recebe um ponto da paleta atual, do tom mais claro (1º) ao mais
  // forte (5º), então a trilha acompanha o esquema de cores escolhido
  const corDoAno = (indice) =>
    misturarCores(cores.igual, cores.numero, indice / (ANOS.length - 1));

  return (
    <View style={styles.trilha}>
      <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧮 Conta Aritmética</Text>
      <View style={styles.lista}>
        {ANOS.map((item, index) => (
          <TouchableOpacity
            key={item.ano}
            style={[styles.node, { backgroundColor: corDoAno(index) }]}
            onPress={() => onSelecionarAno(item.ano)}
          >
            <Text style={styles.nodeTexto}>{item.titulo}</Text>
            <Text style={styles.nodeDescricao}>{item.descricao}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trilha: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  lista: {
    gap: 6,
  },
  node: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nodeTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  nodeDescricao: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
});
