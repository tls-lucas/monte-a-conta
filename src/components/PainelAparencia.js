// src/components/PainelAparencia.js
//
// Painel de configurações de aparência: tema claro/escuro da área de jogo,
// tamanho dos blocos/texto e esquema de cores das peças. Lê/grava tudo via
// AparenciaContext (persistido em AsyncStorage), então qualquer tela que
// use o componente Peça já reflete a mudança na hora.

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAparencia, ESQUEMAS_CORES } from '../contexto/AparenciaContext';
import ColorPicker from './ColorPicker';
import TamanhoSlider from './TamanhoSlider';
import PaletaPreview from './PaletaPreview';

const OPCOES_TEMA = [
  { chave: 'claro', rotulo: '☀️ Claro' },
  { chave: 'escuro', rotulo: '🌙 Escuro' },
];

// OPCOES_TAMANHO removidas — agora usa slider contínuo

const OPCOES_ESQUEMA = [
  { chave: 'azul', rotulo: 'Azul' },
  { chave: 'azul_pastel', rotulo: 'Azul Pastel' },
  { chave: 'verde', rotulo: 'Verde' },
  { chave: 'verde_pastel', rotulo: 'Verde Pastel' },
  { chave: 'roxo', rotulo: 'Roxo' },
  { chave: 'roxo_pastel', rotulo: 'Roxo Pastel' },
  { chave: 'laranja', rotulo: 'Laranja' },
  { chave: 'laranja_pastel', rotulo: 'Laranja Pastel' },
  { chave: 'rosa', rotulo: 'Rosa' },
  { chave: 'rosa_pastel', rotulo: 'Rosa Pastel' },
  { chave: 'quente', rotulo: 'Quente' },
  { chave: 'frio', rotulo: 'Frio' },
  { chave: 'floresta', rotulo: 'Floresta' },
  { chave: 'sunset', rotulo: 'Sunset' },
  { chave: 'neon', rotulo: 'Neon' },
  { chave: 'monocromatico', rotulo: 'Monocromático' },
  { chave: 'personalizado', rotulo: 'Personalizado' },
];

function LinhaOpcoes({ titulo, opcoes, valorAtual, aoEscolher, coresInterface, mostrarPreview }) {
  return (
    <View style={styles.secao}>
      <Text style={[styles.secaoTitulo, { color: coresInterface.textoSecundario }]}>{titulo}</Text>
      <View style={styles.opcoesLinha}>
        {opcoes.map((op) => {
          const selecionado = op.chave === valorAtual;
          return (
            <TouchableOpacity
              key={op.chave}
              style={[styles.opcaoBotao, selecionado && styles.opcaoBotaoSelecionado, { backgroundColor: selecionado ? coresInterface.botaoIconeFundo : coresInterface.fundoCaixa }]}
              onPress={() => aoEscolher(op.chave)}
            >
              <View style={styles.opcaoConteudo}>
                <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado, { color: selecionado ? '#fff' : coresInterface.textoPrincipal }]}>
                  {op.rotulo}
                </Text>
                {mostrarPreview && ESQUEMAS_CORES[op.chave] && (
                  <PaletaPreview cores={ESQUEMAS_CORES[op.chave]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PainelAparencia({ visivel, onFechar }) {
  const {
    tema,
    tamanho,
    esquemaCores,
    corPrincipalMonocromatica,
    coresPersonalizadas,
    definirTema,
    definirTamanho,
    definirEsquemaCores,
    definirCorPrincipalMonocromatica,
    definirCoresPersonalizadas,
    interface: coresInterface,
  } = useAparencia();

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <View style={[styles.cartao, { backgroundColor: coresInterface.fundoTela }]}>
          <View style={styles.cabecalho}>
            <Text style={[styles.titulo, { color: coresInterface.textoPrincipal }]}>🎨 Aparência</Text>
            <TouchableOpacity onPress={onFechar}>
              <Text style={[styles.fechar, { color: coresInterface.textoSecundario }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <LinhaOpcoes
              titulo="Tema da área de jogo"
              opcoes={OPCOES_TEMA}
              valorAtual={tema}
              aoEscolher={definirTema}
              coresInterface={coresInterface}
            />

            <View style={styles.secao}>
              <Text style={[styles.secaoTitulo, { color: coresInterface.textoSecundario }]}>Tamanho dos blocos</Text>
              <TamanhoSlider valorAtual={tamanho} aoMudar={definirTamanho} />
            </View>

            <LinhaOpcoes
              titulo="Cores das peças"
              opcoes={OPCOES_ESQUEMA}
              valorAtual={esquemaCores}
              aoEscolher={definirEsquemaCores}
              coresInterface={coresInterface}
              mostrarPreview={true}
            />

            {esquemaCores === 'monocromatico' && (
              <View style={styles.secao}>
                <Text style={[styles.secaoTitulo, { color: coresInterface.textoSecundario }]}>Cor principal</Text>
                <ColorPicker
                  corSelecionada={corPrincipalMonocromatica}
                  aoEscolher={definirCorPrincipalMonocromatica}
                />
              </View>
            )}

            {esquemaCores === 'personalizado' && (
              <View style={styles.secao}>
                <Text style={[styles.secaoTitulo, { color: coresInterface.textoSecundario }]}>Cor do número</Text>
                <ColorPicker
                  corSelecionada={coresPersonalizadas.numero}
                  aoEscolher={(cor) =>
                    definirCoresPersonalizadas({ ...coresPersonalizadas, numero: cor })
                  }
                />

                <Text style={[styles.secaoTitulo, { color: coresInterface.textoSecundario }]}>Cor do operador</Text>
                <ColorPicker
                  corSelecionada={coresPersonalizadas.operador}
                  aoEscolher={(cor) =>
                    definirCoresPersonalizadas({ ...coresPersonalizadas, operador: cor })
                  }
                />

                <Text style={[styles.secaoTitulo, { color: coresInterface.textoSecundario }]}>Cor do igual</Text>
                <ColorPicker
                  corSelecionada={coresPersonalizadas.igual}
                  aoEscolher={(cor) =>
                    definirCoresPersonalizadas({ ...coresPersonalizadas, igual: cor })
                  }
                />
              </View>
            )}

            <Text style={[styles.aviso, { color: coresInterface.textoSecundario }]}>
              A fase de dinheiro não é afetada — ela sempre usa as cores reais das cédulas. O emoji é sempre branco.
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#eee0cc',
  },
  opcaoBotaoSelecionado: { backgroundColor: '#5b4636' },
  opcaoConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  opcaoTexto: { fontSize: 13, fontWeight: '600', color: '#5b4636' },
  opcaoTextoSelecionado: { color: '#fff' },
  aviso: { fontSize: 12, color: '#8a7a66', fontStyle: 'italic', marginTop: -8 },
});
