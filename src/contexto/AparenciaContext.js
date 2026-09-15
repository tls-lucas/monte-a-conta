// src/contexto/AparenciaContext.js
//
// Preferências globais de aparência (tema claro/escuro da área de jogo,
// tamanho dos blocos/texto e esquema de cores das peças), persistidas em
// AsyncStorage e disponibilizadas via Context pra qualquer tela/peça
// consumir sem precisar passar props manualmente por toda a árvore.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_STORAGE = '@monte_a_conta:preferencias_aparencia';

// Calcular tamanho inicial baseado na largura da tela
function calcularTamanhoInicial() {
  const { width } = Dimensions.get('window');
  if (width < 360) return 0.7;
  if (width < 400) return 0.95;
  if (width < 500) return 1.0;
  return 1.15;
}

const PADRAO = {
  tema: 'claro',
  tamanho: calcularTamanhoInicial(),
  esquemaCores: 'azul',
  corPrincipalMonocromatica: '#1971C2',
  coresPersonalizadas: { numero: '#1971C2', operador: '#4DABF7', igual: '#74C0FC' },
  quantidadeMaxDigitosContaAritmetica: 6,
};

// Gerar variações de tom a partir de uma cor hex (para monocromático)
function gerarTonsMonocromaticos(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const toHex = (r, g, b) => `#${[r, g, b].map(x => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

  return {
    numero: hexColor, // cor principal como número
    operador: toHex(r * 0.7, g * 0.7, b * 0.7), // mais escuro
    igual: toHex(r * 1.2, g * 1.2, b * 1.2), // mais claro
    emoji: '#ffffff', // emoji sempre branco
  };
}

// Paletas de cores pré-definidas — 'cedula' não entra aqui de propósito,
// já que a fase de dinheiro sempre usa a cor real da nota
export const ESQUEMAS_CORES = {
  azul: { numero: '#1971C2', operador: '#4DABF7', igual: '#74C0FC', emoji: '#ffffff' },
  azul_pastel: { numero: '#6B9BD1', operador: '#9AC5E8', igual: '#C3E0F7', emoji: '#ffffff' },
  verde: { numero: '#0B7285', operador: '#37B24D', igual: '#69DB7C', emoji: '#ffffff' },
  verde_pastel: { numero: '#6BA968', operador: '#9DD59E', igual: '#C8E6C9', emoji: '#ffffff' },
  roxo: { numero: '#7950F2', operador: '#9775FA', igual: '#B197FC', emoji: '#ffffff' },
  roxo_pastel: { numero: '#9E7FCC', operador: '#B8A8DB', igual: '#D4C5E8', emoji: '#ffffff' },
  laranja: { numero: '#F08C00', operador: '#FD7E14', igual: '#FF922B', emoji: '#ffffff' },
  laranja_pastel: { numero: '#E8B584', operador: '#F1C9A1', igual: '#F9E4D4', emoji: '#ffffff' },
  rosa: { numero: '#C2255C', operador: '#E64980', igual: '#F06595', emoji: '#ffffff' },
  rosa_pastel: { numero: '#D98BA8', operador: '#E8AFCB', igual: '#F5D5E0', emoji: '#ffffff' },
  quente: { numero: '#C92A2A', operador: '#F08C00', igual: '#FAB005', emoji: '#ffffff' },
  frio: { numero: '#1971C2', operador: '#37B24D', igual: '#7950F2', emoji: '#ffffff' },
  floresta: { numero: '#0B7285', operador: '#4C6EF5', igual: '#69DB7C', emoji: '#ffffff' },
  sunset: { numero: '#C92A2A', operador: '#F08C00', igual: '#FFD43B', emoji: '#ffffff' },
  neon: { numero: '#FF006E', operador: '#FFBE0B', igual: '#3A86FF', emoji: '#ffffff' },
  monocromatico: gerarTonsMonocromaticos('#4d9de0'),
  personalizado: { numero: '#4d9de0', operador: '#f2a154', igual: '#6fc270', emoji: '#ffffff' },
};

export { gerarTonsMonocromaticos };

// cor de fundo do palco (área de arraste) por tema
export const CORES_PALCO = {
  claro: { fundo: '#fdf6ec', caixaFlutuante: '#ffffff', textoCaixa: '#5b4636' },
  escuro: { fundo: '#20242e', caixaFlutuante: '#333a48', textoCaixa: '#f2f2f2' },
};

// cores da interface inteira (cabeçalhos, botões, painéis) por tema
export const CORES_INTERFACE = {
  claro: {
    fundoTela: '#fdf6ec',
    textoPrincipal: '#5b4636',
    textoSecundario: '#8a7a66',
    fundoCaixa: '#ffffff',
    fundoTemaBox: '#ffffff',
    timerBoxFundo: '#eee0cc',
    botaoIconeFundo: '#5b4636',
    botaoFaseDinheiro: '#2e7dd1',
    botaoFaseContagem: '#6fc270',
  },
  escuro: {
    fundoTela: '#1a1f2e',
    textoPrincipal: '#e8eaed',
    textoSecundario: '#b0b3b8',
    fundoCaixa: '#2d3139',
    fundoTemaBox: '#3d4450',
    timerBoxFundo: '#4d5363',
    botaoIconeFundo: '#6b7280',
    botaoFaseDinheiro: '#1e6fb8',
    botaoFaseContagem: '#5ab564',
  },
};

const AparenciaContext = createContext({
  ...PADRAO,
  escala: 1,
  cores: ESQUEMAS_CORES.padrao,
  palco: CORES_PALCO.claro,
  interface: CORES_INTERFACE.claro,
  definirTema: () => {},
  definirTamanho: () => {},
  definirEsquemaCores: () => {},
  definirCorPrincipalMonocromatica: () => {},
  definirCoresPersonalizadas: () => {},
});

export function AparenciaProvider({ children }) {
  const [preferencias, setPreferencias] = useState(PADRAO);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_STORAGE).then((json) => {
      if (json) {
        try {
          const carregado = JSON.parse(json);
          // Migração de tamanho antigo (string) para novo (número)
          if (typeof carregado.tamanho === 'string') {
            const mapeamento = { pequeno: 0.8, medio: 1, grande: 1.25 };
            carregado.tamanho = mapeamento[carregado.tamanho] || PADRAO.tamanho;
          }
          setPreferencias({ ...PADRAO, ...carregado });
        } catch (e) {
          // preferências corrompidas — ignora e mantém o padrão
        }
      }
    });
  }, []);

  function salvar(novasPreferencias) {
    setPreferencias(novasPreferencias);
    AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(novasPreferencias));
  }

  // Calcular cores dinamicamente baseado no esquema
  let cores = ESQUEMAS_CORES[preferencias.esquemaCores];
  if (preferencias.esquemaCores === 'monocromatico') {
    cores = gerarTonsMonocromaticos(preferencias.corPrincipalMonocromatica);
  } else if (preferencias.esquemaCores === 'personalizado') {
    cores = { ...ESQUEMAS_CORES.personalizado, ...preferencias.coresPersonalizadas, emoji: '#ffffff' };
  }

  const valor = {
    ...preferencias,
    escala: preferencias.tamanho,
    cores: cores || ESQUEMAS_CORES.padrao,
    palco: CORES_PALCO[preferencias.tema] || CORES_PALCO.claro,
    interface: CORES_INTERFACE[preferencias.tema] || CORES_INTERFACE.claro,
    definirTema: (tema) => salvar({ ...preferencias, tema }),
    definirTamanho: (tamanho) => salvar({ ...preferencias, tamanho }),
    definirEsquemaCores: (esquemaCores) => salvar({ ...preferencias, esquemaCores }),
    definirCorPrincipalMonocromatica: (cor) => salvar({ ...preferencias, corPrincipalMonocromatica: cor, esquemaCores: 'monocromatico' }),
    definirCoresPersonalizadas: (cores) => salvar({ ...preferencias, coresPersonalizadas: cores, esquemaCores: 'personalizado' }),
    definirQuantidadeMaxDigitosContaAritmetica: (quantidade) => salvar({ ...preferencias, quantidadeMaxDigitosContaAritmetica: Math.max(1, Math.min(6, quantidade)) }),
  };

  return <AparenciaContext.Provider value={valor}>{children}</AparenciaContext.Provider>;
}

export function useAparencia() {
  return useContext(AparenciaContext);
}
