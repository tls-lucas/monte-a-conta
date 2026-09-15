import AsyncStorage from '@react-native-async-storage/async-storage';

export const EMAIL_RELATORIO_KEY = '@monte_a_conta:ultimo_email_relatorio';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function carregarUltimoEmailRelatorio() {
  return AsyncStorage.getItem(EMAIL_RELATORIO_KEY);
}

export async function salvarUltimoEmailRelatorio(email) {
  await AsyncStorage.setItem(EMAIL_RELATORIO_KEY, email.trim());
}

/** `cores` é o esquema ativo ({ numero, operador, igual }); o PDF se pinta com ele. */
export async function enviarRelatorioPorEmail(email, resumo, cores) {
  const resposta = await fetch(`${API_URL}/relatorios/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), resumo, cores }),
  });

  let dados = {};
  try {
    dados = await resposta.json();
  } catch (_) {
    dados = {};
  }

  if (!resposta.ok || !dados.ok) {
    throw new Error(dados.erro || `Servidor respondeu com HTTP ${resposta.status}.`);
  }

  await salvarUltimoEmailRelatorio(email);
  return dados;
}
