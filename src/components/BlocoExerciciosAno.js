// src/components/BlocoExerciciosAno.js
//
// Bloco de exercícios de um ano escolar, misturando tipos (soma, subtração,
// multiplicação, divisão, contagem de emojis e a fase de dinheiro) conforme
// o que cada ano permite (anosEscolares.js). Contas e contagem reaproveitam
// o mesmo motor de arraste-e-alinha — algarismos/peças soltos, sem alvo à
// vista, validados a cada movimentação — e só trocam gerador e validador.
// A fase de dinheiro tem interação própria, então embute o componente
// FaseDinheiro já existente no lugar desse motor.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Peca, { TAMANHO_PECA } from './Peca';
import RotuloIcone from './RotuloIcone';
import PainelAparencia from './PainelAparencia';
import FaseDinheiro from './FaseDinheiro';
import { gerarFase } from '../utils/faseGenerator';
import { contaEstaCorreta } from '../utils/validador';
import { gerarFaseContagem } from '../utils/contagemGenerator';
import { contagemComOperadorEstaCorreta, contagemSimplesEstaCorreta } from '../utils/validadorContagem';
import { configDoAno, nomeAno, sortearTipoExercicio, EXERCICIOS_POR_BLOCO } from '../utils/anosEscolares';
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

// Gera o conteúdo (peças + dados de validação) de um exercício, dado seu tipo.
// Contagem e aritmética compartilham a mesma UI de arraste-e-alinha, só mudam
// o gerador de peças e o validador usado depois em verificar().
function gerarConteudoExercicio(tipo, config) {
  if (tipo === 'contagem') {
    const c = gerarFaseContagem();
    return {
      pecas: c.pecas,
      operacao: 'contagem',
      maxDigitos: 1,
      // dados que a validação de contagem precisa, além das peças —
      // diferente da conta normal, aqui o arranjo tem que bater exatamente
      // com a conta sorteada (ver contagemComOperadorEstaCorreta)
      contagem: { operacaoContagem: c.operacao, a: c.a, b: c.b, resultado: c.resultado },
    };
  }
  return gerarFase({ operacoes: [tipo], maxDigitos: config.maxDigitos });
}

function criarFase(tipo, config, area, ladoPeca) {
  const conteudo = gerarConteudoExercicio(tipo, config);
  const posicoes = {};
  const usadas = [];
  conteudo.pecas.forEach((p) => {
    const pos = posicaoAleatoriaSemSobrepor(usadas, area.w || 320, area.h || 400, ladoPeca);
    usadas.push(pos);
    posicoes[p.id] = pos;
  });
  return { ...conteudo, posicoes };
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
  // `tipoAtual`+`fase`+`emFaseDinheiro` nascem juntos do mesmo sorteio, então
  // vivem num único state: dois useState separados não dá pra inicializar de
  // forma consistente (o segundo não pode "ver" o tipo sorteado pelo primeiro
  // sem sortear de novo). A fase de dinheiro não usa peças-em-fila — ela troca
  // a tela inteira pelo componente FaseDinheiro, então `fase` fica null nesse caso.
  const [slot, setSlot] = useState(() => {
    const tipo = sortearTipoExercicio(config);
    if (tipo === 'dinheiro') return { tipo, fase: null, emFaseDinheiro: true };
    const areaInicial = { w: janela.width, h: janela.height - 120 };
    return { tipo, fase: criarFase(tipo, config, areaInicial, TAMANHO_PECA * escala), emFaseDinheiro: false };
  });
  const { tipo: tipoAtual, fase, emFaseDinheiro } = slot;
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
    if (resolvido || emFaseDinheiro) return;
    setSlot((atual) => {
      const posicoes = {};
      const usadas = [];
      atual.fase.pecas.forEach((p) => {
        const pos = posicaoAleatoriaSemSobrepor(usadas, areaJogo.w, areaJogo.h, ladoPeca);
        usadas.push(pos);
        posicoes[p.id] = pos;
      });
      posicoesAtuais.current = { ...posicoes };
      return { ...atual, fase: { ...atual.fase, posicoes } };
    });
    cancelarConfirmacao();
    setAlinhadas({});
    setLinhaGuiaY(null);
    setLayoutId((n) => n + 1);
  }, [ladoPeca, areaJogo.w, areaJogo.h, emFaseDinheiro]);

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

  // Sorteia o tipo do próximo exercício do bloco (pode repetir o mesmo tipo
  // ou cair num diferente — mistura os exercícios do ano sem sequência fixa).
  function avancarSlot(novoIndice) {
    const tipo = sortearTipoExercicio(config);
    cancelarConfirmacao();
    if (tipo === 'dinheiro') {
      setSlot({ tipo, fase: null, emFaseDinheiro: true });
    } else {
      const nova = criarFase(tipo, config, areaJogo, ladoPeca);
      posicoesAtuais.current = {};
      nova.pecas.forEach((p) => {
        posicoesAtuais.current[p.id] = { ...nova.posicoes[p.id] };
      });
      setSlot({ tipo, fase: nova, emFaseDinheiro: false });
      setFaseId((n) => n + 1);
    }
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
    const categoria = tipoAtual === 'contagem' ? 'contagem' : fase.operacao;
    const nivel = tipoAtual === 'contagem' ? 1 : fase.maxDigitos;
    registrarTempo(categoria, nivel, tempo).then(() => {
      if (ehUltima) {
        setBlocoConcluido(true);
        onConcluido && onConcluido();
        return;
      }
      timeoutProximaRef.current = setTimeout(() => avancarSlot(indiceConta + 1), 1500);
    });
  }

  // A fase de dinheiro registra o próprio tempo (FaseDinheiro chama
  // registrarTempo('dinheiro', ...) internamente); aqui só decide se o bloco
  // acabou ou se avança pro próximo exercício.
  function aoConcluirDinheiro() {
    const ehUltima = indiceConta >= EXERCICIOS_POR_BLOCO - 1;
    if (ehUltima) {
      setSlot((atual) => ({ ...atual, emFaseDinheiro: false }));
      setResolvido(true);
      setBlocoConcluido(true);
      onConcluido && onConcluido();
      return;
    }
    timeoutProximaRef.current = setTimeout(() => avancarSlot(indiceConta + 1), 1500);
  }

  const verificar = useCallback(() => {
    if (resolvido || !fase) return;

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
      if (espacamentoOk) {
        acertouAgora = fase.contagem
          ? fase.contagem.operacaoContagem === 'nenhuma'
            ? contagemSimplesEstaCorreta(pecasOrdenadas, fase.contagem.resultado)
            : contagemComOperadorEstaCorreta(pecasOrdenadas, fase.contagem)
          : contaEstaCorreta(pecasOrdenadas);
      }
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

  // A fase de dinheiro tem interação própria (arrastar cédulas pra somar um
  // valor-alvo, não alinhar peças em fila), então quando sorteada ela troca a
  // tela inteira pelo componente já existente em vez de tentar encaixá-la no
  // motor de arraste-e-alinha das contas/contagem.
  if (emFaseDinheiro) {
    return (
      <FaseDinheiro
        onVoltar={onVoltar}
        onConcluida={aoConcluirDinheiro}
        valorMin={config.dinheiro?.min}
        valorMax={config.dinheiro?.max}
        progresso={`${nomeAno(ano)} · ${Math.min(indiceConta + 1, EXERCICIOS_POR_BLOCO)} de ${EXERCICIOS_POR_BLOCO}`}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <StatusBar style="dark" />
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={onVoltar}>
          <MaterialCommunityIcons name="map" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <RotuloIcone nome="abacus" texto={nomeAno(ano)} cor={coresInterface.textoPrincipal} tamanho={18}
            estiloTexto={[styles.titulo, { color: coresInterface.textoPrincipal }]} />
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>
            Conta {Math.min(indiceConta + 1, EXERCICIOS_POR_BLOCO)} de {EXERCICIOS_POR_BLOCO} · alinhe os blocos em fila
          </Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: coresInterface.timerBoxFundo }]}>
          <RotuloIcone nome="timer-outline" texto={formatarTempo(segundos)} cor={coresInterface.textoPrincipal} tamanho={14}
            estiloTexto={[styles.timerTexto, { color: coresInterface.textoPrincipal }]} style={styles.timerLinha} />
        </View>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => avancarSlot()}>
          <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAparenciaAberto(true)}>
          <MaterialCommunityIcons name="palette" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.palco, { backgroundColor: coresPalco.fundo }]}
        onLayout={(e) =>
          setAreaJogo({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {linhaGuiaY !== null && <View style={[styles.linhaGuia, { top: linhaGuiaY }]} />}

        {fase && fase.pecas.map((p) => (
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
            <RotuloIcone
              nome={blocoConcluido ? 'trophy' : 'party-popper'}
              texto={blocoConcluido ? 'Bloco completo!' : 'Conta certa!'}
              tamanho={26}
              estiloTexto={styles.mensagem}
            />
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
  timerLinha: { gap: 4 },
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
