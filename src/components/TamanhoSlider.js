// src/components/TamanhoSlider.js
//
// Slider horizontal customizado para tamanho, usando PanResponder (sem libs externas).
// Escala contínua de 0.7x a 1.5x.

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';

const MIN_ESCALA = 0.7;
const MAX_ESCALA = 1.5;
const SLIDER_WIDTH = Dimensions.get('window').width - 80; // margem das laterais

function escalarParaX(escala) {
  return ((escala - MIN_ESCALA) / (MAX_ESCALA - MIN_ESCALA)) * SLIDER_WIDTH;
}

function xParaEscala(x) {
  const valor = (x / SLIDER_WIDTH) * (MAX_ESCALA - MIN_ESCALA) + MIN_ESCALA;
  return Math.max(MIN_ESCALA, Math.min(MAX_ESCALA, valor));
}

export default function TamanhoSlider({ valorAtual, aoMudar }) {
  const [position, setPosition] = useState(escalarParaX(valorAtual));
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const novaX = Math.max(0, Math.min(SLIDER_WIDTH, gestureState.moveX - 40)); // 40px offset do container
        setPosition(novaX);
        const novaEscala = xParaEscala(novaX);
        aoMudar(Math.round(novaEscala * 100) / 100); // redondear a 2 casas decimais
      },
    })
  ).current;

  const escalaArredondada = Math.round(valorAtual * 100) / 100;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tamanho: {escalaArredondada}x</Text>
      <View style={styles.sliderTrack}>
        <View
          style={[styles.sliderThumb, { left: position }]}
          {...panResponder.panHandlers}
        />
      </View>
      <View style={styles.marcas}>
        <Text style={styles.marca}>0.7x</Text>
        <Text style={styles.marca}>1.5x</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 8,
  },
  sliderThumb: {
    width: 28,
    height: 28,
    backgroundColor: '#5b4636',
    borderRadius: 14,
    position: 'absolute',
    top: -10,
    marginLeft: -14,
  },
  marcas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marca: {
    fontSize: 12,
    color: '#999',
  },
});
