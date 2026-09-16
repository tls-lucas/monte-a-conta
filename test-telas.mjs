// Toda tela passada a setTela() precisa ter um ramo que a trate, senão cai no
// fallback (a fase livre) — foi o que mandava o botão de voltar do bloco de
// ano para uma fase aleatória em vez do menu.
import { readFileSync } from 'fs';

const src = readFileSync('App.js', 'utf8');
const usadas = new Set([...src.matchAll(/setTela\('([^']+)'\)/g)].map((m) => m[1]));
const tratadas = new Set([...src.matchAll(/tela === '([^']+)'/g)].map((m) => m[1]));
tratadas.add('jogo'); // o fallback do render

const orfas = [...usadas].filter((t) => !tratadas.has(t));
console.assert(orfas.length === 0, `telas sem ramo: ${orfas}`);
if (orfas.length) process.exit(1);
console.log('ok — telas usadas:', [...usadas].join(', '));
