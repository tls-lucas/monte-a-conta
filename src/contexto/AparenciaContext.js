// src/contexto/AparenciaContext.js
//
// Preferências globais de aparência (tema claro/escuro da área de jogo,
// tamanho dos blocos/texto e esquema de cores das peças), persistidas em
// AsyncStorage e disponibilizadas via Context pra qualquer tela/peça
// consumir sem precisar passar props manualmente por toda a árvore.

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_STORAGE = '@monte_a_conta:preferencias_aparencia';

const PADRAO = {
  tema: 'claro', // 'claro' | 'escuro' — afeta só o fundo do palco (área de jogo)
  tamanho: 'medio', // 'pequeno' | 'medio' | 'grande'
  esquemaCores: 'padrao', // 'padrao' | 'pastel' | 'monocromatico' — não afeta a fase de dinheiro
};

// multiplicador aplicado em cima do tamanho base de qualquer peça (dígito,
// operador, emoji ou cédula)
export const ESCALAS_TAMANHO = {
  pequeno: 0.8,
  medio: 1,
  grande: 1.25,
};

// cor por tipo de peça, em cada esquema — 'cedula' não entra aqui de
// propósito, já que a fase de dinheiro sempre usa a cor real da nota
export const ESQUEMAS_CORES = {
  padrao: { numero: '#4d9de0', operador: '#f2a154', igual: '#6fc270', emoji: '#fdf1de' },
  pastel: { numero: '#a7c7e7', operador: '#ffd6a5', igual: '#b5ead7', emoji: '#fff1e6' },
  monocromatico: { numero: '#2b6cb0', operador: '#4299e1', igual: '#90cdf4', emoji: '#bee3f8' },
};

// cor de fundo do palco (área de arraste) por tema
export const CORES_PALCO = {
  claro: { fundo: '#fdf6ec', caixaFlutuante: '#ffffff', textoCaixa: '#5b4636' },
  escuro: { fundo: '#20242e', caixaFlutuante: '#333a48', textoCaixa: '#f2f2f2' },
};

const AparenciaContext = createContext({
  ...PADRAO,
  escala: ESCALAS_TAMANHO.medio,
  cores: ESQUEMAS_CORES.padrao,
  palco: CORES_PALCO.claro,
  definirTema: () => {},
  definirTamanho: () => {},
  definirEsquemaCores: () => {},
});

export function AparenciaProvider({ children }) {
  const [preferencias, setPreferencias] = useState(PADRAO);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_STORAGE).then((json) => {
      if (json) {
        try {
          setPreferencias({ ...PADRAO, ...JSON.parse(json) });
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

  const valor = {
    ...preferencias,
    escala: ESCALAS_TAMANHO[preferencias.tamanho] || 1,
    cores: ESQUEMAS_CORES[preferencias.esquemaCores] || ESQUEMAS_CORES.padrao,
    palco: CORES_PALCO[preferencias.tema] || CORES_PALCO.claro,
    definirTema: (tema) => salvar({ ...preferencias, tema }),
    definirTamanho: (tamanho) => salvar({ ...preferencias, tamanho }),
    definirEsquemaCores: (esquemaCores) => salvar({ ...preferencias, esquemaCores }),
  };

  return <AparenciaContext.Provider value={valor}>{children}</AparenciaContext.Provider>;
}

export function useAparencia() {
  return useContext(AparenciaContext);
}
