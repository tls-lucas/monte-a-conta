import React, { useRef, useReducer, useEffect } from 'react';
import { Animated, Image, PanResponder, Platform, StyleSheet, Text } from 'react-native';
import { useAparencia } from '../contexto/AparenciaContext';

const ARTE_CEDULA = require('../img/nota.png');
// A arte vem em dois tons de cinza. A camada de baixo é tingida com a cor da
// cédula (tintColor achata tudo numa cor só) e a de cima repõe o cinza
// original, meio translúcido, devolvendo o contraste entre moldura e miolo.
const OPACIDADE_SOMBREADO = 0.42;

// cores padrão, usadas como último recurso caso o context não esteja disponível
const CORES_PADRAO = {
  numero: '#4d9de0',
  operador: '#f2a154',
  igual: '#6fc270',
  emoji: '#fdf1de',
};

export const TAMANHO_PECA = 60;
const NA_WEB = Platform.OS === 'web';

function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

export default function Peca({
  id,
  tipo,
  valor,
  posInicial,
  limites,
  alinhada,
  celebrando,
  bloqueada,
  onMove,
  onRelease,
  largura = TAMANHO_PECA,
  altura = TAMANHO_PECA,
  corPersonalizada,
  tamanhoFonte = 26,
}) {
  const { escala: escalaTamanho, cores } = useAparencia();
  const larguraFinal = largura * escalaTamanho;
  const alturaFinal = altura * escalaTamanho;
  const fonteFinal = tamanhoFonte * escalaTamanho;
  // corPersonalizada (usada pela fase de dinheiro) sempre tem prioridade —
  // a fase de dinheiro não participa do esquema de cores configurável
  const corFundo = corPersonalizada || cores[tipo] || CORES_PADRAO[tipo];

  // posição real do bloco vive numa ref (fonte da verdade), não em Animated.Value —
  // evita ler propriedades internas (_value/_offset) que podem virar NaN e "sumir" o bloco.
  const posRef = useRef({ x: posInicial.x, y: posInicial.y });
  const inicioRef = useRef({ x: posInicial.x, y: posInicial.y });
  const inicioPonteiroRef = useRef({ x: 0, y: 0 });
  const arrastandoRef = useRef(false);
  const [, forcarRender] = useReducer((n) => n + 1, 0);

  const escalaAnimada = useRef(new Animated.Value(1)).current;

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
        Animated.timing(escalaAnimada, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.timing(escalaAnimada, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [celebrando]);

  const ehCedula = tipo === 'cedula';

  return (
    <Animated.View
      {...(bloqueada ? {} : NA_WEB ? handlersWeb : panResponder.panHandlers)}
      style={[
        styles.peca,
        {
          width: larguraFinal,
          height: alturaFinal,
          // a cédula é desenhada pela arte; o fundo sólido apagaria o recorte
          backgroundColor: ehCedula ? 'transparent' : corFundo,
          left: posRef.current.x,
          top: posRef.current.y,
          transform: [{ scale: escalaAnimada }],
          borderColor: alinhada ? '#2e8b2e' : 'transparent',
          opacity: bloqueada ? 0.85 : 1,
        },
        ehCedula && styles.pecaCedula,
      ]}
    >
      {ehCedula && (
        <>
          <Image
            source={ARTE_CEDULA}
            style={[styles.arte, { tintColor: corFundo }]}
            resizeMode="stretch"
            pointerEvents="none"
          />
          <Image
            source={ARTE_CEDULA}
            style={[styles.arte, { opacity: OPACIDADE_SOMBREADO }]}
            resizeMode="stretch"
            pointerEvents="none"
          />
        </>
      )}
      <Text
        style={[
          styles.texto,
          { fontSize: fonteFinal },
          ehCedula && styles.textoCedula,
        ]}
        selectable={false}
      >
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
    fontWeight: 'bold',
    ...semInterferenciaWeb,
  },
  pecaCedula: {
    // a silhueta da arte já arredonda os cantos; sombra e borda sólidas
    // apareceriam como um retângulo em volta dela
    shadowOpacity: 0,
    elevation: 0,
    overflow: 'visible',
  },
  arte: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  textoCedula: {
    // o rótulo fica sobre o miolo claro da nota, então precisa de contorno
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
