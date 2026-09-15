// src/components/BlocoExerciciosAno.js
//
// Bloco de exercícios para um ano específico, exibindo exercícios sorteados
// entre os tipos permitidos daquele ano. Reutiliza a dinâmica de arraste
// e validação do App.js/FaseContagem.js.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import Peca, { TAMANHO_PECA } from './Peca';
import PainelAparencia from './PainelAparencia';
import { gerarExerciciosBloco, nomeAno } from '../utils/geradorExercicios';
import { gerarFase } from '../utils/faseGenerator';
import { registrarTempo } from '../utils/estatisticas';
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

function montarPecasDoExercicio(exercicio) {
  const { numero1, operador, numero2, resposta } = exercicio;
  return [
    { id: 'num1', tipo: 'numero', valor: numero1 },
    { id: 'operador', tipo: 'operador', valor: operador },
    { id: 'num2', tipo: 'numero', valor: numero2 },
    { id: 'igual', tipo: 'igual', valor: '=' },
    { id: 'resposta', tipo: 'numero', valor: resposta },
  ];
}

function criarFaseDoExercicio(exercicio, areaJogo) {
  const pecas = montarPecasDoExercicio(exercicio);
  const posicoes = {};
  const usadas = [];
  pecas.forEach((p) => {
    const pos = posicaoAleatoriaSemSobrepor(usadas, areaJogo.w || 320, areaJogo.h || 400);
    usadas.push(pos);
    posicoes[p.id] = pos;
  });
  return { pecas, posicoes, exercicio };
}

function validaAlinhamentoExercicio(pecasOrdenadas, exercicio) {
  const ordemEsperada = ['numero1', 'operador', 'numero2', 'igual', 'resposta'];
  if (pecasOrdenadas.length !== ordemEsperada.length) return false;

  for (let i = 0; i < pecasOrdenadas.length; i++) {
    const esperada = ordemEsperada[i];
    if (pecasOrdenadas[i].id !== esperada) return false;
  }
  return true;
}

export default function BlocoExerciciosAno({ ano, quantidadeMaxDigitos, onVoltar, onConcluido }) {
  const { palco: coresPalco, interface: coresInterface } = useAparencia();
  const [areaJogo, setAreaJogo] = useState({ w: 0, h: 0 });
  const [painelAparenciaAberto, setPainelAparenciaAberto] = useState(false);

  const exerciciosGerados = useRef(gerarExerciciosBloco(ano, quantidadeMaxDigitos)).current;
  const [indiceExercicio, setIndiceExercicio] = useState(0);
  const exercicioAtual = exerciciosGerados[indiceExercicio];

  const [fase, setFase] = useState(() => criarFaseDoExercicio(exercicioAtual, areaJogo));
  const [faseId, setFaseId] = useState(0);
  const posicoesAtuais = useRef({});
  const [alinhadas, setAlinhadas] = useState({});
  const [linhaGuiaY, setLinhaGuiaY] = useState(null);
  const [resolvido, setResolvido] = useState(false);

  const [segundos, setSegundos] = useState(0);
  const [tempoFinal, setTempoFinal] = useState(null);
  const intervaloTimerRef = useRef(null);

  const [emConfirmacao, setEmConfirmacao] = useState(false);
  const [contagemConfirmacao, setContagemConfirmacao] = useState(SEGUNDOS_CONFIRMACAO);
  const intervaloConfirmacaoRef = useRef(null);
  const timeoutConfirmacaoRef = useRef(null);

  useEffect(() => {
    setSegundos(0);
    setTempoFinal(null);
    clearInterval(intervaloTimerRef.current);
    intervaloTimerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
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
    timeoutConfirmacaoRef.current = setTimeout(finalizarExercicio, SEGUNDOS_CONFIRMACAO * 1000);
  }

  function finalizarExercicio() {
    clearInterval(intervaloConfirmacaoRef.current);
    clearTimeout(timeoutConfirmacaoRef.current);
    clearInterval(intervaloTimerRef.current);
    setEmConfirmacao(false);
    setResolvido(true);
    setTempoFinal(segundos);
    Speech.speak('Parabéns! Resposta correta!', { language: 'pt-BR', rate: 0.95 });

    const tipoOp = fase.exercicio.tipo;
    registrarTempo(tipoOp, 1, segundos).then(() => {
      if (indiceExercicio >= exerciciosGerados.length - 1) {
        registrarTempo(`conta_ano_${ano}`, 1, segundos).then(() => {
          onConcluido && onConcluido();
        });
      } else {
        setTimeout(() => {
          setIndiceExercicio((i) => i + 1);
          setResolvido(false);
          setAlinhadas({});
          setLinhaGuiaY(null);
          posicoesAtuais.current = {};
          setFaseId((n) => n + 1);
        }, 1500);
      }
    });
  }

  function gerarNovaFaseAgora() {
    if (indiceExercicio < exerciciosGerados.length) {
      const novaF = criarFaseDoExercicio(exerciciosGerados[indiceExercicio], areaJogo);
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
  }

  useEffect(() => {
    const novaF = criarFaseDoExercicio(exerciciosGerados[indiceExercicio], areaJogo);
    posicoesAtuais.current = {};
    novaF.pecas.forEach((p) => {
      posicoesAtuais.current[p.id] = { ...novaF.posicoes[p.id] };
    });
    setFase(novaF);
    setResolvido(false);
    setAlinhadas({});
    setLinhaGuiaY(null);
  }, [indiceExercicio]);

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
        acertouAgora = validaAlinhamentoExercicio(pecasOrdenadas, fase.exercicio);
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
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧮 {nomeAno(ano)}</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>Alinhe os blocos em fila</Text>
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

      <View style={[styles.infoBox, { backgroundColor: coresInterface.fundoCaixa }]}>
        <Text style={[styles.infoTexto, { color: coresInterface.textoPrincipal }]}>
          Exercício {indiceExercicio + 1} de {exerciciosGerados.length}
        </Text>
        <Text style={[styles.infoTexto, { color: coresInterface.textoPrincipal }]}>
          {fase.exercicio.numero1} {fase.exercicio.operador} {fase.exercicio.numero2} = {fase.exercicio.resposta}
        </Text>
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
            <Text style={styles.mensagem}>🎉 Correto!</Text>
            <Text style={[styles.mensagemTempo, { color: coresPalco.textoCaixa }]}>
              {formatarTempo(tempoFinal ?? segundos)}
            </Text>
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
  infoBox: {
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoTexto: { fontSize: 14, fontWeight: '500', marginVertical: 2 },
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
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -80,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mensagem: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  mensagemTempo: {
    fontSize: 13,
    fontWeight: '500',
  },
});
