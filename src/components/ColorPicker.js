// src/components/ColorPicker.js
//
// Seletor de cores simples com grid de swatches tocáveis, sem dependências externas.

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

const CORES_DISPONIVEIS = [
  '#FF6B6B', '#EE5A6F', '#C92A2A', '#A61E4D',
  '#F06595', '#E64980', '#D6336C', '#C2255C',
  '#F783AC', '#F06595', '#E64980', '#D6336C',
  '#FF922B', '#FD7E14', '#F59F00', '#F08C00',
  '#FFD43B', '#FCC419', '#FAB005', '#F9CA24',
  '#74C0FC', '#4DABF7', '#1C7ED6', '#1971C2',
  '#748FFC', '#5C7CFA', '#4C6EF5', '#364FC7',
  '#B197FC', '#9775FA', '#8458D4', '#7950F2',
  '#BE4BDB', '#B93FB1', '#AE3EC9', '#A371D7',
  '#FF8787', '#F76707', '#69DB7C', '#37B24D',
  '#4DABF7', '#339AF0', '#1C7ED6', '#0B7285',
  '#FFD43B', '#FCC419', '#FAB005', '#F9CA24',
];

export default function ColorPicker({ corSelecionada, aoEscolher }) {
  return (
    <View style={styles.container}>
      {CORES_DISPONIVEIS.map((cor, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.swatch,
            { backgroundColor: cor },
            corSelecionada === cor && styles.swatchSelecionado,
          ]}
          onPress={() => aoEscolher(cor)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelecionado: {
    borderColor: '#000',
  },
});
