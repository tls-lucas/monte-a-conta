// src/components/BlocoExerciciosAno.js
//
// Bloco de contas de um ano escolar. Cada conta é gerada por gerarFase() —
// mesma lógica das outras telas: os algarismos vêm soltos, um bloco por
// dígito, e não há conta alvo exibida. A validação roda a cada movimentação
// via contaEstaCorreta(), que aceita qualquer arranjo matematicamente válido.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import Peca, { TAMANHO_PECA } from './Peca';
import PainelAparencia from './PainelAparencia';
import { gerarFase } from '../utils/faseGenerator';
import { contaEstaCorreta } from '../utils/validador';
import { configDoAno, nomeAno, EXERCICIOS_POR_BLOCO } from '../utils/anosEscolares';
import { registrarTempo } from '../utils/estatisticas';
import { useAparencia } from '../contexto/AparenciaContext';

const TOLERANCIA_Y = 30;
const GAP_MAXIMO = 55;
const SEGUNDOS_CONFIRMACAO = 3;

// `TAMANHO_PECA` é a medida base; a peça desenhada mede isso vezes a escala
// escolhida nas preferências. Sortear posição sem considerar a escala faz a
// peça nascer para fora do palco quando a escala passa de 1.
function posicaoAleatoriaSemSobrepor(existentes, areaW, areaH, ladoPeca) {
  const margem = 16;
  const topoMinimo = 16;
  const distanciaMinima = ladoPeca + 8;
  let tentativa;
  let ok;
  let tentativas = 0;
  do {
    tentativa = {
      x: margem + Math.random() * Math.max(1, areaW - margem * 2 - ladoPeca),
      y: topoMinimo + Math.random() * Math.max(1, areaH - topoMinimo - margem - ladoPeca),
    };
    ok = existentes.every((p) => {
      const dx = Math.abs(p.x - tentativa.x);
      const dy = Math.abs(p.y - tentativa.y);
      return dx > distanciaMinima || dy > distanciaMinima;
    });
    tentativas++;
  } while (!ok && tentativas < 80);
  return tentativa;
}

function formatarTempo(segundosTotais) {
  const m = Math.floor(segundosTotais / 60);
  const s = segundosTotais % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function criarFase(config, area, ladoPeca) {
  const { pecas, sequenciaCorreta, operacao, maxDigitos } = gerarFase(config);
  const posicoes = {};
  const usadas = [];
  pecas.forEach((p) => {
    const pos = posicaoAleatoriaSemSobrepor(usadas, area.w || 320, area.h || 400, ladoPeca);
    usadas.push(pos);
    posicoes[p.id] = pos;
  });
  return { pecas, sequenciaCorreta, posicoes, operacao, maxDigitos };
}

export default function BlocoExerciciosAno({ ano, quantidadeMaxDigitos, onVoltar, onConcluido }) {
  const { palco: coresPalco, interface: coresInterface, escala } = useAparencia();
  const ladoPeca = TAMANHO_PECA * escala;
  // estimativa da área até o onLayout medir o palco de verdade — sem ela a
  // primeira conta nasce toda amontoada num canto
  const janela = Dimensions.get('window');
  const [areaJogo, setAreaJogo] = useState({ w: janela.width, h: janela.height - 120 });
  const [painelAparenciaAberto, setPainelAparenciaAberto] = useState(false);

  const config = configDoAno(ano, quantidadeMaxDigitos);

  const [indiceConta, setIndiceConta] = useState(0);
  const [fase, setFase] = useState(() =>
    criarFase(config, { w: janela.width, h: janela.height - 120 }, TAMANHO_PECA * escala)
  );
  const [faseId, setFaseId] = useState(0);
  // trocado quando só as posições mudam (escala ou área nova), pra remontar as
  // peças sem reiniciar o cronômetro nem sortear outra conta
  const [layoutId, setLayoutId] = useState(0);
  const posicoesAtuais = useRef({});
  const [alinhadas, setAlinhadas] = useState({});
  const [linhaGuiaY, setLinhaGuiaY] = useState(null);
  const [resolvido, setResolvido] = useState(false);
  const [blocoConcluido, setBlocoConcluido] = useState(false);

  const [segundos, setSegundos] = useState(0);
  const [tempoFinal, setTempoFinal] = useState(null);
  const intervaloTimerRef = useRef(null);
  // `verificar` é memoizado sem depender de `segundos`, então a função que o
  // timer de confirmação agenda enxerga o valor do render em que o callback foi
  // criado — que é justamente quando o cronômetro acabou de zerar. A ref dá o
  // valor corrente na hora de fechar a conta.
  const segundosRef = useRef(0);

  const [emConfirmacao, setEmConfirmacao] = useState(false);
  const [contagemConfirmacao, setContagemConfirmacao] = useState(SEGUNDOS_CONFIRMACAO);
  const intervaloConfirmacaoRef = useRef(null);
  const timeoutConfirmacaoRef = useRef(null);
  const timeoutProximaRef = useRef(null);

  useEffect(() => {
    setSegundos(0);
    setTempoFinal(null);
    segundosRef.current = 0;
    clearInterval(intervaloTimerRef.current);
    intervaloTimerRef.current = setInterval(() => {
      segundosRef.current += 1;
      setSegundos(segundosRef.current);
    }, 1000);
    return () => clearInterval(intervaloTimerRef.current);
  }, [faseId]);

  // As preferências chegam do AsyncStorage depois do primeiro render, então a
  // escala em vigor pode não ser a que posicionou as peças. Rearranja a conta
  // atual com a medida correta para nenhuma peça nascer fora do palco.
  useEffect(() => {
    if (resolvido) return;
    setFase((atual) => {
      const posicoes = {};
      const usadas = [];
      atual.pecas.forEach((p) => {
        const pos = posicaoAleatoriaSemSobrepor(usadas, areaJogo.w, areaJogo.h, ladoPeca);
        usadas.push(pos);
        posicoes[p.id] = pos;
      });
      posicoesAtuais.current = { ...posicoes };
      return { ...atual, posicoes };
    });
    cancelarConfirmacao();
    setAlinhadas({});
    setLinhaGuiaY(null);
    setLayoutId((n) => n + 1);
  }, [ladoPeca, areaJogo.w, areaJogo.h]);

  useEffect(
    () => () => {
      clearInterval(intervaloTimerRef.current);
      clearInterval(intervaloConfirmacaoRef.current);
      clearTimeout(timeoutConfirmacaoRef.current);
      clearTimeout(timeoutProximaRef.current);
    },
    []
  );

  function cancelarConfirmacao() {
    clearInterval(intervaloConfirmacaoRef.current);
    clearTimeout(timeoutConfirmacaoRef.current);
    setEmConfirmacao(false);
    setContagemConfirmacao(SEGUNDOS_CONFIRMACAO);
  }

  function iniciarConfirmacao() {
    setEmConfirmacao(true);
    setContagemConfirmacao(SEGUNDOS_CONFIRMACAO);
    intervaloConfirmacaoRef.current = setInterval(() => {
      setContagemConfirmacao((c) => Math.max(0, c - 1));
    }, 1000);
    timeoutConfirmacaoRef.current = setTimeout(finalizarConta, SEGUNDOS_CONFIRMACAO * 1000);
  }

  function trocarFase(novaConfig, novoIndice) {
    const nova = criarFase(novaConfig, areaJogo, ladoPeca);
    posicoesAtuais.current = {};
    nova.pecas.forEach((p) => {
      posicoesAtuais.current[p.id] = { ...nova.posicoes[p.id] };
    });
    cancelarConfirmacao();
    setFase(nova);
    setFaseId((n) => n + 1);
    setResolvido(false);
    setAlinhadas({});
    setLinhaGuiaY(null);
    if (novoIndice !== undefined) setIndiceConta(novoIndice);
  }

  function finalizarConta() {
    clearInterval(intervaloConfirmacaoRef.current);
    clearTimeout(timeoutConfirmacaoRef.current);
    clearInterval(intervaloTimerRef.current);
    const tempo = segundosRef.current;
    setEmConfirmacao(false);
    setResolvido(true);
    setTempoFinal(tempo);
    Speech.speak('Parabéns! A conta está correta!', { language: 'pt-BR', rate: 0.95 });

    const ehUltima = indiceConta >= EXERCICIOS_POR_BLOCO - 1;
    registrarTempo(fase.operacao, fase.maxDigitos, tempo).then(() => {
      if (ehUltima) {
        setBlocoConcluido(true);
        onConcluido && onConcluido();
        return;
      }
      timeoutProximaRef.current = setTimeout(() => trocarFase(config, indiceConta + 1), 1500);
    });
  }

  const verificar = useCallback(() => {
    if (resolvido) return;

    const ids = fase.pecas.map((p) => p.id);
    const centros = ids.map((id) => {
      const pos = posicoesAtuais.current[id] || { x: 0, y: 0 };
      return {
        id,
        cx: pos.x + ladoPeca / 2,
        cy: pos.y + ladoPeca / 2,
        left: pos.x,
        right: pos.x + ladoPeca,
      };
    });

    const mediaY = centros.reduce((s, c) => s + c.cy, 0) / centros.length;
    const novasAlinhadas = {};
    centros.forEach((c) => {
      novasAlinhadas[c.id] = Math.abs(c.cy - mediaY) <= TOLERANCIA_Y;
    });
    setAlinhadas(novasAlinhadas);

    const todasAlinhadas = centros.every((c) => Math.abs(c.cy - mediaY) <= TOLERANCIA_Y);
    setLinhaGuiaY(todasAlinhadas ? mediaY : null);

    let acertouAgora = false;
    if (todasAlinhadas) {
      const ordenadas = [...centros].sort((a, b) => a.cx - b.cx);
      const idParaPeca = Object.fromEntries(fase.pecas.map((p) => [p.id, p]));

      let espacamentoOk = true;
      for (let i = 0; i < ordenadas.length - 1; i++) {
        const gap = ordenadas[i + 1].left - ordenadas[i].right;
        if (gap > GAP_MAXIMO) {
          espacamentoOk = false;
          break;
        }
      }

      const pecasOrdenadas = ordenadas.map((c) => idParaPeca[c.id]);
      acertouAgora = espacamentoOk && contaEstaCorreta(pecasOrdenadas);
    }

    if (acertouAgora) {
      if (!emConfirmacao) iniciarConfirmacao();
    } else if (emConfirmacao) {
      cancelarConfirmacao();
    }
  }, [fase, resolvido, emConfirmacao, ladoPeca]);

  function aoMover(id, x, y) {
    posicoesAtuais.current[id] = { x, y };
    verificar();
  }

  function aoSoltar(id, x, y) {
    posicoesAtuais.current[id] = { x, y };
    verificar();
  }

  const limites = {
    maxX: Math.max(0, areaJogo.w - ladoPeca),
    maxY: Math.max(0, areaJogo.h - ladoPeca),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <StatusBar style="dark" />
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={onVoltar}>
          <Text style={styles.botaoIconeTexto}>🗺️</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧮 {nomeAno(ano)}</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>
            Conta {Math.min(indiceConta + 1, EXERCICIOS_POR_BLOCO)} de {EXERCICIOS_POR_BLOCO} · alinhe os blocos em fila
          </Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: coresInterface.timerBoxFundo }]}>
          <Text style={[styles.timerTexto, { color: coresInterface.textoPrincipal }]}>⏱ {formatarTempo(segundos)}</Text>
        </View>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => trocarFase(config)}>
          <Text style={styles.botaoIconeTexto}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAparenciaAberto(true)}>
          <Text style={styles.botaoIconeTexto}>🎨</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.palco, { backgroundColor: coresPalco.fundo }]}
        onLayout={(e) =>
          setAreaJogo({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {linhaGuiaY !== null && <View style={[styles.linhaGuia, { top: linhaGuiaY }]} />}

        {fase.pecas.map((p) => (
          <Peca
            key={`${faseId}-${layoutId}-${p.id}`}
            id={p.id}
            tipo={p.tipo}
            valor={p.valor}
            posInicial={fase.posicoes[p.id]}
            limites={limites}
            alinhada={!!alinhadas[p.id]}
            celebrando={resolvido}
            bloqueada={resolvido}
            onMove={aoMover}
            onRelease={aoSoltar}
          />
        ))}

        {emConfirmacao && !resolvido && (
          <View style={styles.confirmacaoBox} pointerEvents="none">
            <Text style={[styles.confirmacaoTexto, { backgroundColor: coresPalco.caixaFlutuante }]}>
              Confirmando... {contagemConfirmacao}
            </Text>
          </View>
        )}

        {resolvido && (
          <View style={styles.mensagemBox} pointerEvents="box-none">
            <Text style={styles.mensagem}>{blocoConcluido ? '🏆 Bloco completo!' : '🎉 Conta certa!'}</Text>
            <Text style={[styles.mensagemTempo, { color: coresPalco.textoCaixa }]}>
              Seu tempo: {formatarTempo(tempoFinal ?? segundos)}
            </Text>
            {blocoConcluido && (
              <TouchableOpacity style={[styles.botaoVoltarTrilha, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={onVoltar}>
                <Text style={styles.botaoVoltarTrilhaTexto}>Voltar à trilha</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <PainelAparencia visivel={painelAparenciaAberto} onFechar={() => setPainelAparenciaAberto(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  botaoIcone: {
    borderRadius: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIconeTexto: { fontSize: 18 },
  titulo: { fontSize: 16, fontWeight: 'bold' },
  subtitulo: { fontSize: 12 },
  timerBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerTexto: { fontSize: 14, fontWeight: 'bold' },
  palco: {
    flex: 1,
    position: 'relative',
  },
  linhaGuia: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2e8b2e',
    opacity: 0.5,
  },
  confirmacaoBox: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confirmacaoTexto: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  mensagemBox: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mensagem: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  mensagemTempo: {
    fontSize: 13,
    fontWeight: '500',
  },
  botaoVoltarTrilha: {
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  botaoVoltarTrilhaTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
