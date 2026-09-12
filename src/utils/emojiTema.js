// src/utils/emojiTema.js
//
// Dicionário letra -> emojis cujo nome (em português) começa com essa
// letra. Usado pra sortear o "tema" visual de cada fase de contagem —
// todas as peças da fase usam o mesmo emoji sorteado.
//
// Algumas letras raras em português (K, W, X, Y) usam associações mais
// livres (kiwi, wi-fi, xícara, yoga), já que não há palavras nativas com
// representação óbvia em emoji.

export const EMOJIS_POR_LETRA = {
  A: [
    { emoji: '🐝', nome: 'Abelha' },
    { emoji: '🥑', nome: 'Abacate' },
    { emoji: '✈️', nome: 'Avião' },
  ],
  B: [
    { emoji: '🍌', nome: 'Banana' },
    { emoji: '⚽', nome: 'Bola' },
    { emoji: '🦋', nome: 'Borboleta' },
  ],
  C: [
    { emoji: '🐶', nome: 'Cachorro' },
    { emoji: '🥕', nome: 'Cenoura' },
    { emoji: '🏠', nome: 'Casa' },
  ],
  D: [
    { emoji: '🦷', nome: 'Dente' },
    { emoji: '🎲', nome: 'Dado' },
  ],
  E: [
    { emoji: '🐘', nome: 'Elefante' },
    { emoji: '⭐', nome: 'Estrela' },
  ],
  F: [
    { emoji: '🐜', nome: 'Formiga' },
    { emoji: '🔥', nome: 'Fogo' },
    { emoji: '🌸', nome: 'Flor' },
  ],
  G: [
    { emoji: '🐱', nome: 'Gato' },
    { emoji: '🐔', nome: 'Galinha' },
  ],
  H: [
    { emoji: '🚁', nome: 'Helicóptero' },
    { emoji: '🦛', nome: 'Hipopótamo' },
  ],
  I: [
    { emoji: '🏝️', nome: 'Ilha' },
    { emoji: '⛪', nome: 'Igreja' },
  ],
  J: [
    { emoji: '🐊', nome: 'Jacaré' },
    { emoji: '🪟', nome: 'Janela' },
  ],
  K: [{ emoji: '🥝', nome: 'Kiwi' }],
  L: [
    { emoji: '🦁', nome: 'Leão' },
    { emoji: '🍋', nome: 'Limão' },
  ],
  M: [
    { emoji: '🐒', nome: 'Macaco' },
    { emoji: '🍉', nome: 'Melancia' },
  ],
  N: [
    { emoji: '☁️', nome: 'Nuvem' },
    { emoji: '🚢', nome: 'Navio' },
  ],
  O: [
    { emoji: '🐑', nome: 'Ovelha' },
    { emoji: '🥚', nome: 'Ovo' },
  ],
  P: [
    { emoji: '🐧', nome: 'Pinguim' },
    { emoji: '🍕', nome: 'Pizza' },
    { emoji: '🐷', nome: 'Porco' },
  ],
  Q: [{ emoji: '🧀', nome: 'Queijo' }],
  R: [
    { emoji: '🐀', nome: 'Rato' },
    { emoji: '🌹', nome: 'Rosa' },
  ],
  S: [
    { emoji: '🐍', nome: 'Serpente' },
    { emoji: '☀️', nome: 'Sol' },
  ],
  T: [
    { emoji: '🐢', nome: 'Tartaruga' },
    { emoji: '🐯', nome: 'Tigre' },
  ],
  U: [{ emoji: '🍇', nome: 'Uva' }],
  V: [{ emoji: '🐄', nome: 'Vaca' }],
  W: [{ emoji: '📶', nome: 'Wi-fi' }],
  X: [{ emoji: '☕', nome: 'Xícara' }],
  Y: [{ emoji: '🧘', nome: 'Yoga' }],
  Z: [{ emoji: '🦓', nome: 'Zebra' }],
};

const LETRAS = Object.keys(EMOJIS_POR_LETRA);

/**
 * Sorteia uma letra e um emoji (com nome) correspondente a ela.
 * @returns {{ letra: string, emoji: string, nome: string }}
 */
export function sortearTema() {
  const letra = LETRAS[Math.floor(Math.random() * LETRAS.length)];
  const opcoes = EMOJIS_POR_LETRA[letra];
  const escolhido = opcoes[Math.floor(Math.random() * opcoes.length)];
  return { letra, emoji: escolhido.emoji, nome: escolhido.nome };
}
