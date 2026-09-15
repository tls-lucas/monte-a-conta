import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import Peca, { TAMANHO_PECA } from './src/components/Peca';
import PainelConfig from './src/components/PainelConfig';
import PainelEstatisticas from './src/components/PainelEstatisticas';
import TrilhaFases from './src/components/TrilhaFases';
import TrilhaAnos from './src/components/TrilhaAnos';
import FaseDinheiro from './src/components/FaseDinheiro';
import FaseContagem from './src/components/FaseContagem';
import PainelAparencia from './src/components/PainelAparencia';
import { AparenciaProvider, useAparencia } from './src/contexto/AparenciaContext';
import { gerarFase } from './src/utils/faseGenerator';
import { contaEstaCorreta } from './src/utils/validador';
import { registrarTempo, carregarEstatisticas, calcularResumo, limparEstatisticas } from './src/utils/estatisticas';
import { API_URL } from './src/services/relatorio';

const TOLERANCIA_Y = 30;
const GAP_MAXIMO = 55;
const SEGUNDOS_CONFIRMACAO = 3;

const CONFIGURACAO_ANOS = {
  1: { operacoes: ['soma', 'subtracao'], maxDigitos: 1 },
  2: { operacoes: ['soma', 'subtracao'], maxDigitos: 2 },
  3: { operacoes: ['soma', 'subtracao', 'multiplicacao'], maxDigitos: 2 },
  4: { operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'], maxDigitos: 3 },
  5: { operacoes: ['soma', 'subtracao', 'multiplicacao', 'divisao'], maxDigitos: 6 },
};

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

function AppInterno() {
  const { palco: coresPalco, interface: coresInterface } = useAparencia();
  const [config, setConfig] = useState({
    operacoes: ['soma'],
    maxDigitos: 1,
  });
  const [painelAberto, setPainelAberto] = useState(false);
  const [painelAparenciaAberto, setPainelAparenciaAberto] = useState(false);
  const [painelAparenciaJogoAberto, setPainelAparenciaJogoAberto] = useState(false);
  const [resolvido, setResolvido] = useState(false);

  // 'menu' = trilha de seleção de fases, 'jogo' = tela do jogo em si
  const [tela, setTela] = useState('menu');

  const janela = Dimensions.get('window');
  const [areaJogo, setAreaJogo] = useState({ w: janela.width, h: janela.height - 190 });

  function criarNovaFase(cfg, area) {
    const { pecas, sequenciaCorreta, operacao, maxDigitos } = gerarFase(cfg);
    const posicoes = {};
    const usadas = [];
    pecas.forEach((p) => {
      const pos = posicaoAleatoriaSemSobrepor(usadas, area.w, area.h);
      usadas.push(pos);
      posicoes[p.id] = pos;
    });
    return { pecas, sequenciaCorreta, posicoes, operacao, maxDigitos };
  }

  const [fase, setFase] = useState(() => criarNovaFase(config, areaJogo));
  const [faseId, setFaseId] = useState(0);
  const posicoesAtuais = useRef({});
  const [alinhadas, setAlinhadas] = useState({});
  const [linhaGuiaY, setLinhaGuiaY] = useState(null);

  // --- Estatísticas (tempo médio por operação e por nível de dígitos, salvas em JSON) ---
  const [painelEstatisticasAberto, setPainelEstatisticasAberto] = useState(false);
  const [resumoEstatisticas, setResumoEstatisticas] = useState(null);
  const [estatisticasBrutas, setEstatisticasBrutas] = useState(null);

  async function atualizarResumoEstatisticas() {
    const dados = await carregarEstatisticas();
    setResumoEstatisticas(calcularResumo(dados));
    setEstatisticasBrutas(dados);
  }

  useEffect(() => {
    atualizarResumoEstatisticas();

    // O backend é um serviço separado. Ao iniciar o App.js, apenas verificamos
    // se ele está disponível; a interface principal continua sendo esta tela.
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error('Servidor indisponível');
        return res.json();
      })
      .then(() => console.log('Servidor de relatórios conectado.'))
      .catch(() => console.warn('Servidor de relatórios não está disponível.'));
  }, []);

  // --- Timer (pontuação: quanto menos tempo, melhor) ---
  const [segundos, setSegundos] = useState(0);
  const [tempoFinal, setTempoFinal] = useState(null);
  const intervaloTimerRef = useRef(null);

  useEffect(() => {
    // (re)inicia o timer sempre que uma nova fase é gerada
    setSegundos(0);
    setTempoFinal(null);
    clearInterval(intervaloTimerRef.current);
    intervaloTimerRef.current = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);
    return () => clearInterval(intervaloTimerRef.current);
  }, [faseId]);

  // --- Confirmação de 3s antes de dar a fase como resolvida ---
  const [emConfirmacao, setEmConfirmacao] = useState(false);
  const [contagem, setContagem] = useState(SEGUNDOS_CONFIRMACAO);
  const intervaloConfirmacaoRef = useRef(null);
  const timeoutConfirmacaoRef = useRef(null);

  function cancelarConfirmacao() {
    clearInterval(intervaloConfirmacaoRef.current);
    clearTimeout(timeoutConfirmacaoRef.current);
    setEmConfirmacao(false);
    setContagem(SEGUNDOS_CONFIRMACAO);
  }

  function iniciarConfirmacao() {
    setEmConfirmacao(true);
    setContagem(SEGUNDOS_CONFIRMACAO);
    intervaloConfirmacaoRef.current = setInterval(() => {
      setContagem((c) => Math.max(0, c - 1));
    }, 1000);
    timeoutConfirmacaoRef.current = setTimeout(() => {
      finalizarFase();
    }, SEGUNDOS_CONFIRMACAO * 1000);
  }

  function finalizarFase() {
    clearInterval(intervaloConfirmacaoRef.current);
    clearTimeout(timeoutConfirmacaoRef.current);
    clearInterval(intervaloTimerRef.current);
    setEmConfirmacao(false);
    setResolvido(true);
    setTempoFinal(segundos);
    Speech.speak('Parabéns! A conta está correta!', { language: 'pt-BR', rate: 0.95 });

    // grava o tempo na categoria operação + nível de dígitos dessa fase
    registrarTempo(fase.operacao, fase.maxDigitos, segundos).then(() => {
      atualizarResumoEstatisticas();
    });
  }

  function gerarNovaFaseComConfigAtual(cfgOverride) {
    const cfg = cfgOverride || config;
    const novaFase = criarNovaFase(cfg, areaJogo);
    posicoesAtuais.current = {};
    novaFase.pecas.forEach((p) => {
      posicoesAtuais.current[p.id] = { ...novaFase.posicoes[p.id] };
    });
    cancelarConfirmacao();
    setFase(novaFase);
    setFaseId((n) => n + 1);
    setResolvido(false);
    setAlinhadas({});
    setLinhaGuiaY(null);
    setPainelAberto(false);
  }

  const verificar = useCallback(() => {
    if (resolvido) return; // fase já concluída, ignora novas movimentações

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

      // monta a expressão a partir da ordem espacial atual e valida matematicamente —
      // não compara com uma sequência fixa, então qualquer arranjo que resulte numa
      // conta correta é aceito (ex: troca de ordem em soma/multiplicação também vale)
      const pecasOrdenadas = ordenadas.map((c) => idParaPeca[c.id]);
      acertouAgora = espacamentoOk && contaEstaCorreta(pecasOrdenadas);
    }

    if (acertouAgora) {
      if (!emConfirmacao) iniciarConfirmacao();
    } else if (emConfirmacao) {
      cancelarConfirmacao(); // desalinhou antes de confirmar — pode ter sido acidental
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

  function reiniciarPosicoes() {
    gerarNovaFaseComConfigAtual(config);
  }

  function selecionarFaseNaTrilha(operacao, nivel) {
    const novaConfig = { operacoes: [operacao], maxDigitos: nivel };
    setConfig(novaConfig);
    gerarNovaFaseComConfigAtual(novaConfig);
    setTela('jogo');
  }

  const limites = {
    maxX: Math.max(0, areaJogo.w - TAMANHO_PECA),
    maxY: Math.max(0, areaJogo.h - TAMANHO_PECA),
  };

  if (tela === 'dinheiro') {
    return <FaseDinheiro onVoltar={() => setTela('menu')} onConcluida={atualizarResumoEstatisticas} />;
  }

  if (tela === 'contagem') {
    return <FaseContagem onVoltar={() => setTela('menu')} onConcluida={atualizarResumoEstatisticas} />;
  }

  if (tela === 'trilhaAnos') {
    return (
      <TrilhaAnos
        onSelecionarAno={(ano) => {
          setConfig(CONFIGURACAO_ANOS[ano]);
          setTela('jogo');
        }}
        onVoltar={() => setTela('menu')}
      />
    );
  }

  if (tela === 'menu') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
        <StatusBar style="dark" />
        <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧩 Monte a conta</Text>
            <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>Escolha uma fase pra jogar</Text>
          </View>
          <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelEstatisticasAberto(true)}>
            <Text style={styles.botaoIconeTexto}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAparenciaAberto(true)}>
            <Text style={styles.botaoIconeTexto}>🎨</Text>
          </TouchableOpacity>
        </View>

        <TrilhaFases
          estatisticas={estatisticasBrutas}
          onSelecionarFase={selecionarFaseNaTrilha}
        />

        <TouchableOpacity style={styles.botaoFaseDinheiro} onPress={() => setTela('dinheiro')}>
          <Text style={styles.botaoFaseDinheiroTexto}>💰 Fase de dinheiro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoFaseContagem} onPress={() => setTela('contagem')}>
          <Text style={styles.botaoFaseDinheiroTexto}>🔢 Fase de contagem</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botaoFaseContagem, { backgroundColor: '#8b5fbf' }]} onPress={() => setTela('trilhaAnos')}>
          <Text style={styles.botaoFaseDinheiroTexto}>🧮 Conta (aritmética)</Text>
        </TouchableOpacity>

        <PainelAparencia
          visivel={painelAparenciaAberto}
          onFechar={() => setPainelAparenciaAberto(false)}
        />

        <PainelEstatisticas
          visivel={painelEstatisticasAberto}
          resumo={resumoEstatisticas}
          onFechar={() => setPainelEstatisticasAberto(false)}
          onLimpar={async () => {
            await limparEstatisticas();
            atualizarResumoEstatisticas();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coresInterface.fundoTela }]}>
      <StatusBar style="dark" />
      <View style={[styles.cabecalho, { backgroundColor: coresInterface.fundoTela }]}>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setTela('menu')}>
          <Text style={styles.botaoIconeTexto}>🗺️</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🧩 Monte a conta</Text>
          <Text style={[styles.subtitulo, { color: coresInterface.textoSecundario }]}>Arraste os blocos e alinhe a conta em fila</Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: coresInterface.timerBoxFundo }]}>
          <Text style={[styles.timerTexto, { color: coresInterface.textoPrincipal }]}>⏱ {formatarTempo(segundos)}</Text>
        </View>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelEstatisticasAberto(true)}>
          <Text style={styles.botaoIconeTexto}>📊</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAberto(true)}>
          <Text style={styles.botaoIconeTexto}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={reiniciarPosicoes}>
          <Text style={styles.botaoIconeTexto}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoIcone, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={() => setPainelAparenciaJogoAberto(true)}>
          <Text style={styles.botaoIconeTexto}>🎨</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.palco, { backgroundColor: coresPalco.fundo }]}
        onLayout={(e) => {
          setAreaJogo({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          });
        }}
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
            <Text
              style={[
                styles.confirmacaoTexto,
                { backgroundColor: coresPalco.caixaFlutuante },
              ]}
            >
              Confirmando... {contagem}
            </Text>
          </View>
        )}

        {resolvido && (
          <View style={styles.mensagemBox} pointerEvents="box-none">
            <Text style={styles.mensagem}>🎉 Parabéns! Conta certa!</Text>
            <Text style={[styles.mensagemTempo, { color: coresPalco.textoCaixa }]}>
              Seu tempo: {formatarTempo(tempoFinal ?? segundos)}
            </Text>
            <TouchableOpacity
              style={styles.botaoNovaFase}
              onPress={() => gerarNovaFaseComConfigAtual(config)}
            >
              <Text style={styles.botaoNovaFaseTexto}>🔁 Gerar nova fase</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <PainelConfig
        visivel={painelAberto}
        config={config}
        onMudarConfig={setConfig}
        onFechar={() => setPainelAberto(false)}
        onGerarNovaFase={() => gerarNovaFaseComConfigAtual(config)}
      />

      <PainelAparencia
        visivel={painelAparenciaJogoAberto}
        onFechar={() => setPainelAparenciaJogoAberto(false)}
      />

      <PainelEstatisticas
        visivel={painelEstatisticasAberto}
        resumo={resumoEstatisticas}
        onFechar={() => setPainelEstatisticasAberto(false)}
        onLimpar={async () => {
          await limparEstatisticas();
          atualizarResumoEstatisticas();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf6ec',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5b4636',
  },
  subtitulo: {
    fontSize: 13,
    color: '#8a7a66',
    marginTop: 2,
  },
  timerBox: {
    backgroundColor: '#eee0cc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  timerTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5b4636',
  },
  botaoIcone: {
    marginLeft: 10,
    backgroundColor: '#5b4636',
    borderRadius: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIconeTexto: {
    fontSize: 18,
  },
  botaoFaseDinheiro: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#2e7dd1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoFaseContagem: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#6fc270',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoFaseDinheiroTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f2a154',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mensagemBox: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mensagem: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6fc270',
  },
  mensagemTempo: {
    fontSize: 15,
    color: '#5b4636',
    marginTop: 4,
  },
  botaoNovaFase: {
    marginTop: 12,
    backgroundColor: '#4d9de0',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  botaoNovaFaseTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default function App() {
  return (
    <AparenciaProvider>
      <AppInterno />
    </AparenciaProvider>
  );
}
