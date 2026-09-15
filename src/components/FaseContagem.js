// src/components/FaseContagem.js
//
// Tela do módulo de contagem: peças unárias ilustradas com emoji (cada
// peça vale 1). Sorteia uma letra + emoji como tema da fase, sorteia a
// operação (soma, subtração ou nenhuma), e reaproveita o mesmo fluxo de
// arraste/alinhamento/confirmação de 3s das fases de conta — só o
// validador muda (validadorContagem.js), já que aqui o valor de um grupo
// vem da contagem de peças, não da concatenação de dígitos.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import Peca, { TAMANHO_PECA } from './Peca';
import PainelAparencia from './PainelAparencia';
import { gerarFaseContagem } from '../utils/contagemGenerator';
import {
  contagemComOperadorEstaCorreta,
  contagemSimplesEstaCorreta,
} from '../utils/validadorContagem';
import { registrarTempo, NIVEL_UNICO } from '../utils/estatisticas';
import { useAparencia } from '../contexto/AparenciaContext';

const TOLERANCIA_Y = 30;
const GAP_MAXIMO = 55;
const SEGUNDOS_CONFIRMACAO = 3;

function posicaoAleatoriaSemSobrepor(existentes, areaW, areaH) {
  const margem = 16;
  const topoMinimo = 16;
  let tentativa;
  let ok;
  let tentativas = 0;
  do {
    tentativa = {
      x: margem + Math.random() * Math.max(1, areaW - margem * 2 - TAMANHO_PECA),
      y: topoMinimo + Math.random() * Math.max(1, areaH - topoMinimo - TAMANHO_PECA),
    };
    ok = existentes.every((p) => {
      const dx = Math.abs(p.x - tentativa.x);
      const dy = Math.abs(p.y - tentativa.y);
      return dx > 68 || dy > 68;
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

const ROTULO_OPERACAO = {
  soma: 'Soma',
  subtracao: 'Subtração',
  nenhuma: 'Contagem',
};

const SIMBOLO_OPERACAO = {
  soma: '+',
  subtracao: '-',
};

export default function FaseContagem({ onVoltar, onConcluida }) {
  const { palco: coresPalco, interface: coresInterface } = useAparencia();
  const [areaJogo, setAreaJogo] = useState({ w: 0, h: 0 });
  const [painelAparenciaAberto, setPainelAparenciaAberto] = useState(false);

  function novaFase(area) {
    const dados = gerarFaseContagem();
    const posicoes = {};
    const usadas = [];
    dados.pecas.forEach((p) => {
      const pos = posicaoAleatoriaSemSobrepor(usadas, area.w || 320, area.h || 400);
      usadas.push(pos);
      posicoes[p.id] = pos;
    });
    return { ...dados, posicoes };
  }

  const [fase, setFase] = useState(() => novaFase({ w: 0, h: 0 }));
  const [faseId, setFaseId] = useState(0);
  const posicoesAtuais = useRef({});
  const [alinhadas, setAlinhadas] = useState({});
  const [linhaGuiaY, setLinhaGuiaY] = useState(null);
  const [resolvido, setResolvido] = useState(false);

  const [segundos, setSegundos] = useState(0);
  const [tempoFinal, setTempoFinal] = useState(null);
  const intervaloTimerRef = useRef(null);
  // `verificar` é memoizado sem depender de `segundos`, então finalizarFase
  // enxergaria o valor do render em que o callback foi criado — zero, já que é
  // logo depois do cronômetro reiniciar. A ref dá o valor corrente.
  const segundosRef = useRef(0);

  const [emConfirmacao, setEmConfirmacao] = useState(false);
  const [contagemConfirmacao, setContagemConfirmacao] = useState(SEGUNDOS_CONFIRMACAO);
  const intervaloConfirmacaoRef = useRef(null);
  const timeoutConfirmacaoRef = useRef(null);

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
    timeoutConfirmacaoRef.current = setTimeout(finalizarFase, SEGUNDOS_CONFIRMACAO * 1000);
  }

  function finalizarFase() {
    clearInterval(intervaloConfirmacaoRef.current);
    clearTimeout(timeoutConfirmacaoRef.current);
    clearInterval(intervaloTimerRef.current);
    const tempo = segundosRef.current;
    setEmConfirmacao(false);
    setResolvido(true);
    setTempoFinal(tempo);
    Speech.speak('Parabéns! Contagem certa!', { language: 'pt-BR', rate: 0.95 });
    registrarTempo('contagem', NIVEL_UNICO, tempo).then(() => {
      onConcluida && onConcluida();
    });
  }

  function gerarNovaFaseAgora() {
    const novaF = novaFase(areaJogo);
    posicoesAtuais.current = {};
    novaF.pecas.forEach((p) => {
      posicoesAtuais.current[p.id] = { ...novaF.posicoes[p.id] };
    });
    cancelarConfirmacao();
    setFase(novaF);
    setFaseId((n) => n + 1);
    setResolvido(false);
    setAlinhadas({});
    setLinhaGuiaY(null);
  }

  const verificar = useCallback(() => {
    if (resolvido) return;

    const ids = fase.pecas.map((p) => p.id);
    const centros = ids.map((id) => {
      const pos = posicoesAtuais.current[id] || { x: 0, y: 0 };
      return {
        id,
        cx: pos.x + TAMANHO_PECA / 2,
        cy: pos.y + TAMANHO_PECA / 2,
        left: pos.x,
        right: pos.x + TAMANHO_PECA,
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
      if (espacamentoOk) {
        acertouAgora =
          fase.operacao === 'nenhuma'
            ? contagemSimplesEstaCorreta(pecasOrdenadas, fase.resultado)
            : contagemComOperadorEstaCorreta(pecasOrdenadas, {
                a: fase.a,
                b: fase.b,
                resultado: fase.resultado,
              });
      }
    }

    if (acertouAgora) {
      if (!emConfirmacao) iniciarConfirmacao();
    } else if (emConfirmacao) {
      cancelarConfirmacao();
    }
  }, [fase, resolvido, emConfirmacao]);

  function aoMover(id, x, y) {
    posicoesAtuais.current[id] = { x, y };
    verificar();
  }

  function aoSoltar(id, x, y) {
    posicoesAtuais.current[id] = { x, y };
    verificar();
  }

  const limites = {
    maxX: Math.max(0, areaJogo.w - TAMANHO_PECA),
    maxY: Math.max(0, areaJogo.h - TAMANHO_PECA),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <StatusBar style="dark" />
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={onVoltar}>
          <Text style={styles.botaoIconeTexto}>🗺️</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>{fase.emoji} Contagem</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>
            {ROTULO_OPERACAO[fase.operacao]} · alinhe as peças em fila
          </Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: coresInterface.timerBoxFundo }]}>
          <Text style={[styles.timerTexto, { color: coresInterface.textoPrincipal }]}>⏱ {formatarTempo(segundos)}</Text>
        </View>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={gerarNovaFaseAgora}>
          <Text style={styles.botaoIconeTexto}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAparenciaAberto(true)}>
          <Text style={styles.botaoIconeTexto}>🎨</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.temaBox, { backgroundColor: coresInterface.fundoCaixa }]}>
        <Text style={[styles.temaTexto, { color: coresInterface.textoPrincipal }]}>
          Tema: {fase.emoji}{' '}
          <Text style={styles.temaLetraDestaque}>{fase.nomeEmoji.charAt(0)}</Text>
          {fase.nomeEmoji.slice(1)}
        </Text>
        {fase.operacao !== 'nenhuma' && (
          <Text style={[styles.temaTexto, { color: coresInterface.textoPrincipal }]}>
            Conta alvo: {fase.a}
            {SIMBOLO_OPERACAO[fase.operacao]}
            {fase.b}={fase.resultado}
          </Text>
        )}
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
            key={`${faseId}-${p.id}`}
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
            <Text style={styles.mensagem}>🎉 Contagem certa!</Text>
            <Text style={[styles.mensagemTempo, { color: coresPalco.textoCaixa }]}>
              Seu tempo: {formatarTempo(tempoFinal ?? segundos)}
            </Text>
            <TouchableOpacity style={styles.botaoNovaFase} onPress={gerarNovaFaseAgora}>
              <Text style={styles.botaoNovaFaseTexto}>🔁 Gerar nova fase</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <PainelAparencia
        visivel={painelAparenciaAberto}
        onFechar={() => setPainelAparenciaAberto(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6ec' },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#5b4636' },
  subtitulo: { fontSize: 13, color: '#8a7a66', marginTop: 2 },
  timerBox: {
    backgroundColor: '#eee0cc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  timerTexto: { fontSize: 16, fontWeight: 'bold', color: '#5b4636' },
  botaoIcone: {
    marginLeft: 10,
    backgroundColor: '#5b4636',
    borderRadius: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIconeTexto: { fontSize: 18 },
  temaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  temaTexto: { fontSize: 14, fontWeight: '600', color: '#5b4636' },
  temaLetraDestaque: { color: '#c0392b', fontWeight: '900', fontSize: 16 },
  palco: { flex: 1, position: 'relative' },
  linhaGuia: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2e8b2e',
    opacity: 0.5,
  },
  confirmacaoBox: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' },
  confirmacaoTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f2a154',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mensagemBox: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' },
  mensagem: { fontSize: 20, fontWeight: 'bold', color: '#6fc270' },
  mensagemTempo: { fontSize: 15, color: '#5b4636', marginTop: 4 },
  botaoNovaFase: {
    marginTop: 12,
    backgroundColor: '#4d9de0',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  botaoNovaFaseTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
