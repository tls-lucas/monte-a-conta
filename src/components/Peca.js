import React, { useRef, useReducer, useEffect } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text } from 'react-native';

const CORES = {
  numero: '#4d9de0',
  operador: '#f2a154',
  igual: '#6fc270',
};

export const TAMANHO_PECA = 60;
const NA_WEB = Platform.OS === 'web';

function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

export default function Peca({ id, tipo, valor, posInicial, limites, alinhada, celebrando, bloqueada, onMove, onRelease }) {
  // posição real do bloco vive numa ref (fonte da verdade), não em Animated.Value —
  // evita ler propriedades internas (_value/_offset) que podem virar NaN e "sumir" o bloco.
  const posRef = useRef({ x: posInicial.x, y: posInicial.y });
  const inicioRef = useRef({ x: posInicial.x, y: posInicial.y });
  const inicioPonteiroRef = useRef({ x: 0, y: 0 });
  const arrastandoRef = useRef(false);
  const [, forcarRender] = useReducer((n) => n + 1, 0);

  const escala = useRef(new Animated.Value(1)).current;

  function aplicarPosicao(dx, dy) {
    let novoX = inicioRef.current.x + dx;
    let novoY = inicioRef.current.y + dy;
    if (limites) {
      novoX = clamp(novoX, 0, limites.maxX);
      novoY = clamp(novoY, 0, limites.maxY);
    }
    posRef.current = { x: novoX, y: novoY };
    forcarRender();
    return posRef.current;
  }

  // --- Nativo (iOS/Android): PanResponder de sempre, funciona bem pois o toque
  // é rastreado por ID, não por estar "em cima" da view.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        inicioRef.current = { x: posRef.current.x, y: posRef.current.y };
      },
      onPanResponderMove: (evt, gesture) => {
        const p = aplicarPosicao(gesture.dx, gesture.dy);
        onMove(id, p.x, p.y);
      },
      onPanResponderRelease: (evt, gesture) => {
        const p = aplicarPosicao(gesture.dx, gesture.dy);
        onRelease(id, p.x, p.y);
      },
      onPanResponderTerminate: () => {
        onRelease(id, posRef.current.x, posRef.current.y);
      },
    })
  ).current;

  // --- Web: usa Pointer Events + setPointerCapture, para o bloco continuar
  // "ouvindo" o mouse mesmo quando o cursor sai da área dele (o bug relatado).
  const handlersWeb = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      inicioRef.current = { x: posRef.current.x, y: posRef.current.y };
      inicioPonteiroRef.current = { x: e.clientX, y: e.clientY };
      arrastandoRef.current = true;
      e.preventDefault?.();
    },
    onPointerMove: (e) => {
      if (!arrastandoRef.current) return;
      const dx = e.clientX - inicioPonteiroRef.current.x;
      const dy = e.clientY - inicioPonteiroRef.current.y;
      const p = aplicarPosicao(dx, dy);
      onMove(id, p.x, p.y);
    },
    onPointerUp: (e) => {
      if (!arrastandoRef.current) return;
      arrastandoRef.current = false;
      onRelease(id, posRef.current.x, posRef.current.y);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    },
    onPointerCancel: () => {
      arrastandoRef.current = false;
      onRelease(id, posRef.current.x, posRef.current.y);
    },
  };

  useEffect(() => {
    if (celebrando) {
      Animated.sequence([
        Animated.timing(escala, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [celebrando]);

  return (
    <Animated.View
      {...(bloqueada ? {} : NA_WEB ? handlersWeb : panResponder.panHandlers)}
      style={[
        styles.peca,
        {
          backgroundColor: CORES[tipo],
          left: posRef.current.x,
          top: posRef.current.y,
          transform: [{ scale: escala }],
          borderColor: alinhada ? '#2e8b2e' : 'transparent',
          opacity: bloqueada ? 0.85 : 1,
        },
      ]}
    >
      <Text style={styles.texto} selectable={false}>
        {valor}
      </Text>
    </Animated.View>
  );
}

// no web, o Text é selecionável por padrão e o touch-action padrão atrapalha o
// arraste — desliga os dois só nessa plataforma.
const semInterferenciaWeb = Platform.select({
  web: {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
    cursor: 'grab',
  },
  default: {},
});

const styles = StyleSheet.create({
  peca: {
    width: TAMANHO_PECA,
    height: TAMANHO_PECA,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    ...semInterferenciaWeb,
  },
  texto: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    ...semInterferenciaWeb,
  },
});
