import type { Mensagem } from '@/types/mensagem';
import { htmlParaTexto } from './utils';

/**
 * Busca universal do Pregador OS.
 *
 * Roda 100% client-side sobre o IndexedDB. Resultados em milissegundos.
 *
 * Características:
 *  - **Insensível a acento e maiúsculas** — "salvacao" acha "Salvação",
 *    "espirito santo" acha "Espírito Santo". Essencial em português.
 *  - **Ponderação por campo** — um match no título vale mais que no conteúdo.
 *  - **Cobertura de termos** — documentos que contêm TODAS as palavras da
 *    consulta sobem no ranking (busca estilo AND, sem excluir os parciais).
 *  - **Frase exata** — se a consulta inteira aparece junto, ganha um bônus.
 *  - **Trecho (snippet)** — devolve um pedaço do texto ao redor do match,
 *    preservando os acentos originais.
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

/**
 * "Dobra" o texto removendo acentos e passando pra minúsculo, **preservando o
 * comprimento** (cada caractere vira exatamente um caractere). Isso garante que
 * um índice encontrado no texto dobrado aponte para a mesma posição no texto
 * original — então o trecho exibido mantém os acentos.
 */
const MAPA_ACENTOS: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n', ý: 'y', ÿ: 'y',
};

function dobrar(texto: string): string {
  let out = '';
  for (const ch of texto.toLowerCase()) out += MAPA_ACENTOS[ch] ?? ch;
  return out;
}

function trechoEm(original: string, dobrado: string, idx: number, tamTermo: number): string {
  const inicio = Math.max(0, idx - 30);
  const fim = Math.min(original.length, idx + tamTermo + 60);
  // usa o texto ORIGINAL (com acentos) para exibir, mas o índice veio do dobrado
  return (
    (inicio > 0 ? '…' : '') +
    original.slice(inicio, fim).trim() +
    (fim < original.length ? '…' : '')
  );
}

export function buscar(mensagens: Mensagem[], termo: string): ResultadoBusca[] {
  const consultaDobrada = dobrar(termo.trim());
  if (!consultaDobrada) return [];

  const tokens = consultaDobrada.split(/\s+/).filter(Boolean);
  const ehFrase = tokens.length > 1;

  const resultados: ResultadoBusca[] = [];

  for (const m of mensagens) {
    let scoreTotal = 0;
    let melhorCampo = '';
    let melhorTrecho = '';
    let melhorPesoTrecho = -1;
    const tokensEncontrados = new Set<string>();

    const avaliar = (
      original: string,
      peso: number,
      campo: string,
      permiteTrecho: boolean,
    ) => {
      if (!original) return;
      const dobrado = dobrar(original);
      let scoreCampo = 0;

      for (const tok of tokens) {
        const idx = dobrado.indexOf(tok);
        if (idx >= 0) {
          tokensEncontrados.add(tok);
          scoreCampo += peso * (tok.length / 4);
          if (permiteTrecho && peso > melhorPesoTrecho) {
            melhorCampo = campo;
            melhorTrecho = trechoEm(original, dobrado, idx, tok.length);
            melhorPesoTrecho = peso;
          }
        }
      }

      // frase inteira aparece junta neste campo → forte sinal de relevância
      if (ehFrase && dobrado.includes(consultaDobrada)) {
        scoreCampo += peso * 2;
      }

      scoreTotal += scoreCampo;
    };

    // campos ponderados
    for (const { key, peso } of CAMPOS_PESOS) {
      const valor = m[key];
      const texto = typeof valor === 'string' ? valor : Array.isArray(valor) ? valor.join(' ') : '';
      avaliar(texto, peso, key as string, true);
    }

    // tags, personagens, versículos, aplicações, ilustrações, frases marcantes
    const extras = [
      ...m.tags,
      ...m.personagens,
      ...m.versiculos.map((v) => `${v.livro} ${v.capitulo}:${v.versiculos}`),
      ...m.aplicacoes,
      ...m.ilustracoes,
      ...m.frasesMarcantes,
    ].join(' ');
    avaliar(extras, 4, 'tags', false);

    // conteúdo (Tiptap HTML → texto)
    avaliar(htmlParaTexto(m.conteudo), 2, 'conteudo', true);

    if (scoreTotal <= 0) continue;

    // Bônus de cobertura: quanto mais palavras da consulta o documento contém,
    // mais relevante. Conter TODAS multiplica o score (busca estilo AND).
    const cobertura = tokensEncontrados.size / tokens.length;
    scoreTotal *= 0.5 + cobertura; // 0.5×..1.5× conforme a cobertura
    if (tokens.length > 1 && cobertura === 1) scoreTotal += 6; // todas as palavras

    resultados.push({
      mensagem: m,
      trecho: melhorTrecho || undefined,
      campo: melhorCampo,
      score: scoreTotal,
    });
  }

  return resultados.sort((a, b) => b.score - a.score);
}
