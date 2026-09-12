// src/components/PainelAparencia.js
//
// Painel de configurações de aparência: tema claro/escuro da área de jogo,
// tamanho dos blocos/texto e esquema de cores das peças. Lê/grava tudo via
// AparenciaContext (persistido em AsyncStorage), então qualquer tela que
// use o componente Peça já reflete a mudança na hora.

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAparencia } from '../contexto/AparenciaContext';

const OPCOES_TEMA = [
  { chave: 'claro', rotulo: '☀️ Claro' },
  { chave: 'escuro', rotulo: '🌙 Escuro' },
];

const OPCOES_TAMANHO = [
  { chave: 'pequeno', rotulo: 'Pequeno' },
  { chave: 'medio', rotulo: 'Médio' },
  { chave: 'grande', rotulo: 'Grande' },
];

const OPCOES_ESQUEMA = [
  { chave: 'padrao', rotulo: 'Padrão' },
  { chave: 'pastel', rotulo: 'Pastel' },
  { chave: 'monocromatico', rotulo: 'Monocromático' },
];

function LinhaOpcoes({ titulo, opcoes, valorAtual, aoEscolher }) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <View style={styles.opcoesLinha}>
        {opcoes.map((op) => {
          const selecionado = op.chave === valorAtual;
          return (
            <TouchableOpacity
              key={op.chave}
              style={[styles.opcaoBotao, selecionado && styles.opcaoBotaoSelecionado]}
              onPress={() => aoEscolher(op.chave)}
            >
              <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado]}>
                {op.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PainelAparencia({ visivel, onFechar }) {
  const { tema, tamanho, esquemaCores, definirTema, definirTamanho, definirEsquemaCores } =
    useAparencia();

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <View style={styles.cartao}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>🎨 Aparência</Text>
            <TouchableOpacity onPress={onFechar}>
              <Text style={styles.fechar}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <LinhaOpcoes
              titulo="Tema da área de jogo"
              opcoes={OPCOES_TEMA}
              valorAtual={tema}
              aoEscolher={definirTema}
            />
            <LinhaOpcoes
              titulo="Tamanho dos blocos"
              opcoes={OPCOES_TAMANHO}
              valorAtual={tamanho}
              aoEscolher={definirTamanho}
            />
            <LinhaOpcoes
              titulo="Cores das peças"
              opcoes={OPCOES_ESQUEMA}
              valorAtual={esquemaCores}
              aoEscolher={definirEsquemaCores}
            />
            <Text style={styles.aviso}>
              A fase de dinheiro não é afetada — ela sempre usa as cores reais das cédulas.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  cartao: {
    backgroundColor: '#fdf6ec',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#5b4636' },
  fechar: { fontSize: 20, color: '#8a7a66', paddingHorizontal: 6 },
  secao: { marginBottom: 20 },
  secaoTitulo: { fontSize: 14, fontWeight: '700', color: '#8a7a66', marginBottom: 8 },
  opcoesLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcaoBotao: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eee0cc',
  },
  opcaoBotaoSelecionado: { backgroundColor: '#5b4636' },
  opcaoTexto: { fontSize: 14, fontWeight: '600', color: '#5b4636' },
  opcaoTextoSelecionado: { color: '#fff' },
  aviso: { fontSize: 12, color: '#8a7a66', fontStyle: 'italic', marginTop: -8 },
});
