// src/components/RotuloIcone.js
//
// Ícone vetorial + texto na mesma linha, no lugar dos emojis que serviam de
// ícone de interface. Emoji depende da fonte do sistema: muda de desenho
// entre Android, iOS e navegador, e alguns símbolos caem para o glifo
// monocromático ou para o retângulo vazio. O vetorial acompanha a cor e o
// tamanho do texto ao lado.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RotuloIcone({ nome, texto, cor, tamanho = 18, estiloTexto, style }) {
  return (
    <View style={[styles.linha, style]}>
      <MaterialCommunityIcons name={nome} size={tamanho} color={cor} />
      <Text style={estiloTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
