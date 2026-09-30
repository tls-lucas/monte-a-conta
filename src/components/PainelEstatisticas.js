import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RotuloIcone from './RotuloIcone';
import { useAparencia } from '../contexto/AparenciaContext';
import { OPERACOES_DISPONIVEIS } from '../utils/faseGenerator';
import { NIVEIS_LISTA, MODOS_LISTA } from '../utils/estatisticas';
import { carregarUltimoEmailRelatorio, enviarRelatorioPorEmail } from '../services/relatorio';

function formatarTempo(segundos) {
  if (segundos === null || segundos === undefined) return '—';
  const arred = Math.round(segundos);
  const m = Math.floor(arred / 60);
  const s = arred % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PainelEstatisticas({ visivel, resumo, onFechar, onLimpar }) {
  const { interface: coresInterface, cores } = useAparencia();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (visivel) {
      carregarUltimoEmailRelatorio().then((salvo) => {
        if (salvo) setEmail(salvo);
      });
    }
  }, [visivel]);

  async function enviar() {
    const destinatario = email.trim();
    if (!destinatario || !/^\S+@\S+\.\S+$/.test(destinatario)) {
      Alert.alert('E-mail inválido', 'Digite um endereço de e-mail válido para enviar o relatório.');
      return;
    }
    if (!resumo) {
      Alert.alert('Aguarde', 'As estatísticas ainda estão sendo carregadas.');
      return;
    }

    try {
      setEnviando(true);
      await enviarRelatorioPorEmail(destinatario, resumo, {
        numero: cores.numero,
        operador: cores.operador,
        igual: cores.igual,
      });
      Alert.alert('Relatório enviado', `O relatório foi enviado para ${destinatario}.`);
    } catch (erro) {
      Alert.alert('Erro ao enviar', erro.message || 'Não foi possível enviar o relatório.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar}>
        <Pressable style={[styles.painel, { backgroundColor: coresInterface.fundoTela }]} onPress={(e) => e.stopPropagation()}>
          <RotuloIcone nome="chart-bar" texto="Estatísticas (tempo médio)" cor={coresInterface.textoPrincipal} tamanho={20}
            estiloTexto={[styles.titulo, { color: coresInterface.textoPrincipal }]} style={styles.tituloLinha} />

          <ScrollView style={{ maxHeight: 420 }}>
            {OPERACOES_DISPONIVEIS.map((op) => {
              const geral = resumo?.porOperacao?.[op.chave];
              return (
                <View key={op.chave} style={[styles.blocoOperacao, { backgroundColor: coresInterface.fundoCaixa }]}>
                  <View style={styles.linhaGeral}>
                    <Text style={[styles.nomeOperacao, { color: coresInterface.textoPrincipal }]}>
                      {op.simbolo} {op.rotulo}
                    </Text>
                    <Text style={styles.mediaGeral}>
                      {formatarTempo(geral?.media)}{' '}
                      <Text style={[styles.quantidade, { color: coresInterface.textoSecundario }]}>({geral?.quantidade || 0})</Text>
                    </Text>
                  </View>

                  <View style={styles.linhaNiveis}>
                    {NIVEIS_LISTA.map((n) => {
                      const cat = resumo?.porCategoria?.[op.chave]?.[n];
                      return (
                        <View key={n} style={[styles.chipNivel, { backgroundColor: coresInterface.fundoTemaBox }]}>
                          <Text style={[styles.chipNivelTitulo, { color: coresInterface.textoSecundario }]}>{n} díg.</Text>
                          <Text style={[styles.chipNivelMedia, { color: coresInterface.textoPrincipal }]}>{formatarTempo(cat?.media)}</Text>
                          <Text style={[styles.chipNivelQtd, { color: coresInterface.textoSecundario }]}>{cat?.quantidade || 0}x</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <Text style={[styles.tituloSecao, { color: coresInterface.textoSecundario }]}>Fases sem níveis de dígitos</Text>
            {MODOS_LISTA.map((modo) => {
              const dados = resumo?.porModo?.[modo.chave];
              return (
                <View key={modo.chave} style={[styles.linhaModo, { backgroundColor: coresInterface.fundoCaixa }]}>
                  <RotuloIcone
                    nome={modo.icone}
                    texto={modo.rotulo}
                    cor={coresInterface.textoPrincipal}
                    tamanho={16}
                    estiloTexto={[styles.nomeModo, { color: coresInterface.textoPrincipal }]}
                  />
                  <Text style={styles.mediaGeral}>
                    {formatarTempo(dados?.media)}{' '}
                    <Text style={[styles.quantidade, { color: coresInterface.textoSecundario }]}>({dados?.quantidade || 0})</Text>
                  </Text>
                </View>
              );
            })}

            <View style={[styles.areaEnvio, { backgroundColor: coresInterface.fundoCaixa }]}>
              <RotuloIcone nome="email-outline" texto="Enviar relatório em PDF" cor={coresInterface.textoPrincipal} tamanho={17}
                estiloTexto={[styles.tituloEnvio, { color: coresInterface.textoPrincipal }]} style={styles.tituloEnvioLinha} />
              <Text style={[styles.descricaoEnvio, { color: coresInterface.textoSecundario }]}>
                Digite o e-mail do destinatário. O último endereço usado fica salvo neste dispositivo.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="destinatario@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!enviando}
                style={[styles.inputEmail, { backgroundColor: coresInterface.fundoTemaBox, color: coresInterface.textoPrincipal }]}
                placeholderTextColor={coresInterface.textoSecundario}
              />
              <TouchableOpacity
                style={[styles.botaoEnviar, enviando && styles.botaoDesabilitado]}
                onPress={enviar}
                disabled={enviando}
              >
                {enviando ? (
                  <View style={styles.enviandoLinha}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.botaoEnviarTexto}> Enviando...</Text>
                  </View>
                ) : (
                  <RotuloIcone nome="send" texto="Enviar relatório PDF" cor="#fff" tamanho={16} estiloTexto={styles.botaoEnviarTexto} />
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.botaoLimpar} onPress={onLimpar}>
            <Text style={styles.botaoLimparTexto}>Limpar histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.botaoSecundario, { backgroundColor: coresInterface.botaoIconeFundo }]} onPress={onFechar}>
            <Text style={styles.botaoSecundarioTexto}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  painel: { backgroundColor: '#fdf6ec', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 34 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#5b4636' },
  tituloLinha: { justifyContent: 'center', marginBottom: 14 },
  tituloEnvioLinha: { marginBottom: 5 },
  blocoOperacao: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10 },
  linhaGeral: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nomeOperacao: { fontSize: 15, fontWeight: 'bold', color: '#5b4636' },
  mediaGeral: { fontSize: 15, fontWeight: 'bold', color: '#4d9de0' },
  quantidade: { fontSize: 12, color: '#8a7a66', fontWeight: 'normal' },
  linhaNiveis: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  chipNivel: { flex: 1, backgroundColor: '#fdf6ec', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  chipNivelTitulo: { fontSize: 11, color: '#8a7a66' },
  chipNivelMedia: { fontSize: 14, fontWeight: 'bold', color: '#5b4636', marginTop: 2 },
  chipNivelQtd: { fontSize: 10, color: '#8a7a66', marginTop: 1 },
  tituloSecao: { fontSize: 13, fontWeight: '700', color: '#8a7a66', marginTop: 4, marginBottom: 6 },
  linhaModo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  nomeModo: { fontSize: 14, fontWeight: '600', color: '#5b4636' },
  areaEnvio: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 10, marginBottom: 8 },
  tituloEnvio: { fontSize: 16, fontWeight: 'bold', color: '#5b4636', marginBottom: 5 },
  descricaoEnvio: { fontSize: 12, lineHeight: 17, color: '#8a7a66', marginBottom: 10 },
  inputEmail: { backgroundColor: '#fdf6ec', borderWidth: 1, borderColor: '#d8c7b3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#5b4636', marginBottom: 10 },
  botaoEnviar: { backgroundColor: '#4d9de0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  botaoDesabilitado: { opacity: 0.7 },
  enviandoLinha: { flexDirection: 'row', alignItems: 'center' },
  botaoEnviarTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  botaoLimpar: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  botaoLimparTexto: { color: '#c0392b', fontSize: 13 },
  botaoSecundario: { marginTop: 4, backgroundColor: '#5b4636', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  botaoSecundarioTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
