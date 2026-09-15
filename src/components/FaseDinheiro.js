// src/components/FaseDinheiro.js
//
// Tela independente do novo tipo de fase: em vez de montar uma conta com
// operadores, o jogador arrasta cédulas de dinheiro real (R$2 a R$200) pra
// dentro de uma área de destino até a soma bater exatamente com o
// valor-alvo. Não reaproveita faseGenerator.js/validador.js (que são
// específicos das fases de operação) — é um tipo de fase à parte, seguindo
// os mesmos padrões visuais (peça arrastável, timer, estatísticas).

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import Peca from './Peca';
import PainelAparencia from './PainelAparencia';
import { NOTAS_DISPONIVEIS, gerarValorAlvo } from '../utils/notasGenerator';
import { registrarTempo } from '../utils/estatisticas';
import { useAparencia } from '../contexto/AparenciaContext';

const LARGURA_CEDULA = 84;
const ALTURA_CEDULA = 54;
const FONTE_CEDULA = 15;
const AREA_MARGEM = 16;
const AREA_ALTURA = 160;

// cores aproximadas das cédulas reais, só pra ajudar a diferenciar visualmente
const NOTAS_INFO = {
  2: { cor: '#8a8f99', rotulo: 'R$2' },
  5: { cor: '#8e5ba6', rotulo: 'R$5' },
  10: { cor: '#c0392b', rotulo: 'R$10' },
  20: { cor: '#d4a017', rotulo: 'R$20' },
  50: { cor: '#c9781f', rotulo: 'R$50' },
  100: { cor: '#2e7dd1', rotulo: 'R$100' },
  200: { cor: '#c23b6e', rotulo: 'R$200' },
};

function formatarTempo(segundosTotais) {
  const m = Math.floor(segundosTotais / 60);
  const s = segundosTotais % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// posiciona uma cédula nova na "bandeja" (área abaixo do destino), sem
// sobrepor as que já estão lá — mesma lógica de posicaoAleatoriaSemSobrepor
// do App.js, adaptada pro tamanho da cédula e pra região da bandeja.
function posicaoNaBandeja(existentes, areaW, areaH) {
  const margem = 16;
  const topoBandeja = AREA_MARGEM * 2 + AREA_ALTURA;
  let tentativa;
  let ok;
  let tentativas = 0;
  do {
    tentativa = {
      x: margem + Math.random() * Math.max(1, areaW - margem * 2 - LARGURA_CEDULA),
      y: topoBandeja + Math.random() * Math.max(1, areaH - topoBandeja - ALTURA_CEDULA - margem),
    };
    ok = existentes.every((p) => {
      const dx = Math.abs(p.x - tentativa.x);
      const dy = Math.abs(p.y - tentativa.y);
      return dx > LARGURA_CEDULA * 0.8 || dy > ALTURA_CEDULA * 0.8;
    });
    tentativas++;
  } while (!ok && tentativas < 80);
  return tentativa;
}

export default function FaseDinheiro({ onVoltar, onConcluida }) {
  const { palco: coresPalco, interface: coresInterface } = useAparencia();
  const [areaPalco, setAreaPalco] = useState({ w: 0, h: 0 });
  const [pecas, setPecas] = useState([]);
  const [dentroArea, setDentroArea] = useState({});
  const [valorAlvo, setValorAlvo] = useState(0);
  const [valorAtual, setValorAtual] = useState(0);
  const [concluida, setConcluida] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [rodada, setRodada] = useState(0);
  const [painelAparenciaAberto, setPainelAparenciaAberto] = useState(false);

  const posicoesAtuais = useRef({});
  const contadorId = useRef(0);
  const intervaloTimerRef = useRef(null);

  function iniciarNovaFase() {
    setPecas([]);
    posicoesAtuais.current = {};
    setDentroArea({});
    setValorAtual(0);
    setConcluida(false);
    setValorAlvo(gerarValorAlvo());
    setSegundos(0);
    setRodada((r) => r + 1);
  }

  useEffect(() => {
    iniciarNovaFase();
  }, []);

  useEffect(() => {
    clearInterval(intervaloTimerRef.current);
    if (!concluida) {
      intervaloTimerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    }
    return () => clearInterval(intervaloTimerRef.current);
  }, [rodada, concluida]);

  const areaDestino = {
    x: AREA_MARGEM,
    y: AREA_MARGEM,
    w: Math.max(0, areaPalco.w - AREA_MARGEM * 2),
    h: AREA_ALTURA,
  };

  function finalizarFase(segundosFinais) {
    clearInterval(intervaloTimerRef.current);
    setConcluida(true);
    Speech.speak('Parabéns! Valor certinho!', { language: 'pt-BR', rate: 0.95 });
    registrarTempo('dinheiro', 1, segundosFinais).then(() => {
      onConcluida && onConcluida();
    });
  }

  // recalcula quais peças estão dentro da área de destino e a soma delas —
  // só considera "dentro" pelo centro da cédula, igual ao critério de
  // alinhamento das fases de conta
  const verificar = useCallback(() => {
    if (concluida) return;
    const novoDentro = {};
    let soma = 0;
    pecas.forEach((p) => {
      const pos = posicoesAtuais.current[p.id] || { x: 0, y: 0 };
      const cx = pos.x + LARGURA_CEDULA / 2;
      const cy = pos.y + ALTURA_CEDULA / 2;
      const estaDentro =
        cx >= areaDestino.x &&
        cx <= areaDestino.x + areaDestino.w &&
        cy >= areaDestino.y &&
        cy <= areaDestino.y + areaDestino.h;
      novoDentro[p.id] = estaDentro;
      if (estaDentro) soma += p.valor;
    });
    setDentroArea(novoDentro);
    setValorAtual(soma);

    if (valorAlvo > 0 && soma === valorAlvo) {
      finalizarFase(segundos);
    }
  }, [pecas, concluida, valorAlvo, segundos, areaDestino.x, areaDestino.y, areaDestino.w, areaDestino.h]);

  useEffect(() => {
    verificar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecas]);

  function adicionarCedula(valor) {
    const id = `cedula-${contadorId.current++}`;
    const pos = posicaoNaBandeja(Object.values(posicoesAtuais.current), areaPalco.w, areaPalco.h);
    posicoesAtuais.current[id] = pos;
    setPecas((atual) => [...atual, { id, valor }]);
  }

  function aoMover(id, x, y) {
    posicoesAtuais.current[id] = { x, y };
    verificar();
  }

  function aoSoltar(id, x, y) {
    posicoesAtuais.current[id] = { x, y };
    verificar();
  }

  const limites = {
    maxX: Math.max(0, areaPalco.w - LARGURA_CEDULA),
    maxY: Math.max(0, areaPalco.h - ALTURA_CEDULA),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <StatusBar style="dark" />
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={onVoltar}>
          <Text style={styles.botaoIconeTexto}>🗺️</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>💰 Monte o valor</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>Some cédulas até bater o valor-alvo</Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: coresInterface.timerBoxFundo }]}>
          <Text style={[styles.timerTexto, { color: coresInterface.textoPrincipal }]}>⏱ {formatarTempo(segundos)}</Text>
        </View>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAparenciaAberto(true)}>
          <Text style={styles.botaoIconeTexto}>🎨</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: coresInterface.fundoCaixa }]}>
        <Text style={[styles.infoTexto, { color: coresInterface.textoPrincipal }]}>Valor-alvo: R$ {valorAlvo}</Text>
        <Text style={[styles.infoTexto, { color: coresInterface.textoPrincipal }]}>Valor atual: R$ {valorAtual}</Text>
        <Text style={[styles.infoStatus, concluida && styles.infoStatusOk]}>
          {concluida ? 'Fase concluída!' : 'Incompleta'}
        </Text>
      </View>

      <View
        style={[styles.palco, { backgroundColor: coresPalco.fundo }]}
        onLayout={(e) =>
          setAreaPalco({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        <View
          style={[
            styles.areaDestino,
            { top: areaDestino.y, left: areaDestino.x, width: areaDestino.w, height: areaDestino.h },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.areaDestinoTexto}>Área de destino</Text>
        </View>

        {pecas.map((p) => (
          <Peca
            key={p.id}
            id={p.id}
            tipo="cedula"
            valor={NOTAS_INFO[p.valor].rotulo}
            posInicial={posicoesAtuais.current[p.id]}
            limites={limites}
            alinhada={!!dentroArea[p.id]}
            celebrando={concluida}
            bloqueada={concluida}
            onMove={aoMover}
            onRelease={aoSoltar}
            largura={LARGURA_CEDULA}
            altura={ALTURA_CEDULA}
            corPersonalizada={NOTAS_INFO[p.valor].cor}
            tamanhoFonte={FONTE_CEDULA}
          />
        ))}

        {concluida && (
          <View style={styles.mensagemBox} pointerEvents="box-none">
            <Text style={styles.mensagem}>🎉 Valor certinho!</Text>
            <TouchableOpacity style={styles.botaoNovaFase} onPress={iniciarNovaFase}>
              <Text style={styles.botaoNovaFaseTexto}>🔁 Gerar nova fase</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.botoesContainer}
        showsHorizontalScrollIndicator={false}
        style={[styles.botoesScroll, { borderTopColor: coresInterface.timerBoxFundo }]}
      >
        {NOTAS_DISPONIVEIS.map((valor) => (
          <TouchableOpacity
            key={valor}
            style={[styles.botaoNota, { backgroundColor: NOTAS_INFO[valor].cor }]}
            onPress={() => adicionarCedula(valor)}
          >
            <Text style={styles.botaoNotaTexto}>+ R$ {valor}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  },
  timerTexto: { fontSize: 16, fontWeight: 'bold', color: '#5b4636' },
  botaoIcone: {
    backgroundColor: '#5b4636',
    borderRadius: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIconeTexto: { fontSize: 18 },
  infoBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTexto: { fontSize: 14, fontWeight: '600', color: '#5b4636' },
  infoStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#c0392b',
    backgroundColor: '#fbeaea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoStatusOk: { color: '#1f7a3d', backgroundColor: '#e4f6e8' },
  palco: { flex: 1, position: 'relative' },
  areaDestino: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#b7a68c',
    borderRadius: 14,
    backgroundColor: 'rgba(183, 166, 140, 0.12)',
    alignItems: 'center',
    paddingTop: 6,
  },
  areaDestinoTexto: { color: '#8a7a66', fontSize: 12, fontWeight: '600' },
  mensagemBox: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' },
  mensagem: { fontSize: 20, fontWeight: 'bold', color: '#6fc270' },
  botaoNovaFase: {
    marginTop: 12,
    backgroundColor: '#4d9de0',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  botaoNovaFaseTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  botoesScroll: { maxHeight: 76, borderTopWidth: 1, borderTopColor: '#eee0cc' },
  botoesContainer: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  botaoNota: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  botaoNotaTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
