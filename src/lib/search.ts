import type { Mensagem } from '@/types/mensagem';
import { htmlParaTexto } from './utils';

/**
 * Busca universal do Pregador OS.
 *
 * Roda 100% client-side sobre o IndexedDB. Resultados em milissegundos.
 * Quando o universo crescer (centenas de mensagens), pode ser complementada
 * por um índice Full-Text (Fuse.js) carregado sob demanda.
 */

export interface ResultadoBusca {
  mensagem: Mensagem;
  /** Trecho do texto onde houve match */
  trecho?: string;
  /** Campo onde houve match */
  campo: string;
  /** Pontuação: maior = mais relevante */
  score: number;
}

const CAMPOS_PESOS: { key: keyof Mensagem; peso: number }[] = [
  { key: 'titulo', peso: 10 },
  { key: 'tema', peso: 8 },
  { key: 'textoBase', peso: 7 },
  { key: 'livroBiblico', peso: 6 },
  { key: 'objetivo', peso: 5 },
  { key: 'comentarios', peso: 3 },
  { key: 'contextoHistorico', peso: 3 },
  { key: 'conclusao', peso: 3 },
  { key: 'oracao', peso: 2 },
];

export function buscar(mensagens: Mensagem[], termo: string): ResultadoBusca[] {
  const t = termo.trim().toLowerCase();
  if (!t) return [];

  const resultados: ResultadoBusca[] = [];
  const tokens = t.split(/\s+/).filter(Boolean);

  for (const m of mensagens) {
    let scoreTotal = 0;
    let melhorCampo = '';
    let melhorTrecho = '';

    for (const { key, peso } of CAMPOS_PESOS) {
      const valor = m[key];
      const texto = typeof valor === 'string' ? valor : Array.isArray(valor) ? valor.join(' ') : '';
      const lower = texto.toLowerCase();
      let scoreCampo = 0;

      for (const tok of tokens) {
        if (lower.includes(tok)) {
          scoreCampo += peso * (tok.length / 4);
        }
      }

      if (scoreCampo > 0 && scoreCampo > scoreTotal) {
        melhorCampo = key as string;
        const idx = lower.indexOf(tokens[0]);
        if (idx >= 0) {
          const inicio = Math.max(0, idx - 30);
          const fim = Math.min(texto.length, idx + 80);
          melhorTrecho = (inicio > 0 ? '…' : '') + texto.slice(inicio, fim) + (fim < texto.length ? '…' : '');
        }
      }
      scoreTotal += scoreCampo;
    }

    // busca também em tags, personagens e versículos
    const extras = [
      ...m.tags,
      ...m.personagens,
      ...m.versiculos.map((v) => `${v.livro} ${v.capitulo}:${v.versiculos}`),
      ...m.aplicacoes,
      ...m.ilustracoes,
      ...m.frasesMarcantes,
    ].join(' ').toLowerCase();

    for (const tok of tokens) {
      if (extras.includes(tok)) scoreTotal += 4;
    }

    // busca no conteúdo (Tiptap HTML)
    const textoConteudo = htmlParaTexto(m.conteudo).toLowerCase();
    for (const tok of tokens) {
      if (textoConteudo.includes(tok)) {
        scoreTotal += 2;
        if (!melhorTrecho) {
          const idx = textoConteudo.indexOf(tok);
          const inicio = Math.max(0, idx - 30);
          const fim = Math.min(textoConteudo.length, idx + 80);
          melhorTrecho = (inicio > 0 ? '…' : '') + textoConteudo.slice(inicio, fim) + (fim < textoConteudo.length ? '…' : '');
          melhorCampo = 'conteudo';
        }
      }
    }

    if (scoreTotal > 0) {
      resultados.push({
        mensagem: m,
        trecho: melhorTrecho || undefined,
        campo: melhorCampo,
        score: scoreTotal,
      });
    }
  }

  return resultados.sort((a, b) => b.score - a.score);
}