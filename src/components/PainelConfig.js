import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { OPERACOES_DISPONIVEIS } from '../utils/faseGenerator';

export default function PainelConfig({ visivel, config, onMudarConfig, onFechar, onGerarNovaFase }) {
  function alternarOperacao(chave) {
    const jaAtiva = config.operacoes.includes(chave);
    let novasOperacoes;
    if (jaAtiva) {
      // impede desmarcar a última operação ativa
      if (config.operacoes.length === 1) return;
      novasOperacoes = config.operacoes.filter((op) => op !== chave);
    } else {
      novasOperacoes = [...config.operacoes, chave];
    }
    onMudarConfig({ ...config, operacoes: novasOperacoes });
  }

  function definirDigitos(n) {
    onMudarConfig({ ...config, maxDigitos: n });
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar}>
        <Pressable style={styles.painel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.titulo}>⚙️ Configurar fase</Text>

          <Text style={styles.secao}>Operações permitidas</Text>
          <View style={styles.linhaChips}>
            {OPERACOES_DISPONIVEIS.map((op) => {
              const ativa = config.operacoes.includes(op.chave);
              return (
                <TouchableOpacity
                  key={op.chave}
                  onPress={() => alternarOperacao(op.chave)}
                  style={[styles.chip, ativa && styles.chipAtivo]}
                >
                  <Text style={[styles.chipTexto, ativa && styles.chipTextoAtivo]}>
                    {op.simbolo} {op.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.secao}>Números com até quantos dígitos?</Text>
          <View style={styles.linhaChips}>
            {[1, 2, 3, 4].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => definirDigitos(n)}
                style={[styles.chipDigito, config.maxDigitos === n && styles.chipAtivo]}
              >
                <Text style={[styles.chipTexto, config.maxDigitos === n && styles.chipTextoAtivo]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.botaoPrincipal} onPress={onGerarNovaFase}>
            <Text style={styles.botaoPrincipalTexto}>🔁 Gerar nova fase</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoSecundario} onPress={onFechar}>
            <Text style={styles.botaoSecundarioTexto}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  painel: {
    backgroundColor: '#fdf6ec',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 34,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5b4636',
    marginBottom: 14,
    textAlign: 'center',
  },
  secao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8a7a66',
    marginTop: 10,
    marginBottom: 8,
  },
  linhaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eee0cc',
  },
  chipDigito: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eee0cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAtivo: {
    backgroundColor: '#6fc270',
  },
  chipTexto: {
    color: '#5b4636',
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: '#fff',
  },
  botaoPrincipal: {
    marginTop: 22,
    backgroundColor: '#4d9de0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoPrincipalTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoSecundario: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    color: '#8a7a66',
    fontSize: 14,
  },
});
