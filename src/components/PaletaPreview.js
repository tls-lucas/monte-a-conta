// src/components/PaletaPreview.js
//
// Componente que mostra a preview das 3 cores (número/operador/igual) de uma paleta.

import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function PaletaPreview({ cores }) {
  return (
    <View style={styles.container}>
      <View style={[styles.cor, { backgroundColor: cores.numero }]} />
      <View style={[styles.cor, { backgroundColor: cores.operador }]} />
      <View style={[styles.cor, { backgroundColor: cores.igual }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  cor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
});
