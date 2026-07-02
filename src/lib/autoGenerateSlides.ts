/**
 * autoGenerateSlides — Gera e persiste slides no IndexedDB/Dexie
 * após o usuário adicionar conteúdo ao esboço via SelectionMenu.
 *
 * Fluxo:
 * 1. Recebe o estado atual do copilotOutlineStore
 * 2. Cria/atualiza Mensagem no IndexedDB com a pasta selecionada
 * 3. Gera slides via gerarSlides()
 * 4. Atualiza a Mensagem com os slides gerados
 *
 * A pasta (série) é a referência principal — se pastaId for null,
 * cria um "Esboço avulso" sem série.
 */

import { db } from '@/db/schema';
import { gerarSlides, gerarSlidesMinimos } from '@/lib/slideGenerator';
import { novaMensagem } from '@/types/mensagem';
import type { Mensagem } from '@/types/mensagem';
import type { SessionContext, PontoEsboço } from '@/types/copilotOutline';

/** ID da "pasta avulsa" (sem série) — usada quando pastaId é null */
const PASTA_AVULSA_ID = 'avulso';

function formatarEsboco(store: Pick<SessionContext,
  | 'titulo' | 'subtitulo' | 'tema' | 'objetivo'
  | 'textoBase' | 'publico' | 'serie'
  | 'introducao' | 'pontos' | 'conclusao'
  | 'resumo' | 'tempoEstimado' | 'conversaId'
  | 'pastaId' | 'pastaNome' | 'pastaCor'
>): string {
  const linhas: string[] = [];
  if (store.titulo) linhas.push(`<h1>${store.titulo}</h1>`);
  if (store.subtitulo) linhas.push(`<h2>${store.subtitulo}</h2>`);
  if (store.textoBase) linhas.push(`<p><strong>Texto Base:</strong> ${store.textoBase}</p>`);
  if (store.tema) linhas.push(`<p><strong>Tema:</strong> ${store.tema}</p>`);
  if (store.objetivo) linhas.push(`<p><strong>Objetivo:</strong> ${store.objetivo}</p>`);
  if (store.introducao) linhas.push(`<h2>Introdução</h2><p>${store.introducao}</p>`);
  store.pontos.forEach((p: PontoEsboço, i: number) => {
    linhas.push(`<h2>${i + 1}. ${p.texto}</h2>`);
    p.subpontos.forEach((sp: string, j: number) => linhas.push(`<h3>${String.fromCharCode(97 + j)}) ${sp}</h3>`));
    p.aplicacoes.forEach((app: string) => linhas.push(`<p>→ ${app}</p>`));
  });
  if (store.conclusao) linhas.push(`<h2>Conclusão</h2><p>${store.conclusao}</p>`);
  return linhas.join('');
}

function estadoToMensagem(
  store: Pick<SessionContext,
    | 'titulo' | 'subtitulo' | 'tema' | 'objetivo'
    | 'textoBase' | 'publico' | 'serie'
    | 'introducao' | 'pontos' | 'conclusao'
    | 'resumo' | 'tempoEstimado' | 'conversaId'
    | 'pastaId' | 'pastaNome' | 'pastaCor'
  >,
): Pick<Mensagem, 'titulo' | 'esboco' | 'textoBase' | 'tema' | 'objetivo' | 'publico' | 'conclusao' | 'categoria' | 'status' | 'serie'> {
  const esboco = formatarEsboco(store);
  return {
    titulo: store.titulo || store.pastaNome || 'Pregação em preparação',
    esboco,
    textoBase: store.textoBase,
    tema: store.tema,
    objetivo: store.objetivo,
    publico: store.publico,
    conclusao: store.conclusao,
    categoria: 'pregacao',
    status: 'rascunho',
    serie: store.pastaId ?? PASTA_AVULSA_ID,
  };
}

export interface AutoSlideResult {
  mensagemId: string;
  slidesCount: number;
  pastaNome: string | null;
}

/**
 * Gera slides a partir do estado atual do outline e salva no IndexedDB.
 * Retorna o ID da mensagem criada e a contagem de slides.
 */
export async function autoGenerateSlides(
  store: Pick<SessionContext,
    | 'titulo' | 'subtitulo' | 'tema' | 'objetivo'
    | 'textoBase' | 'publico' | 'serie'
    | 'introducao' | 'pontos' | 'conclusao'
    | 'resumo' | 'tempoEstimado' | 'conversaId'
    | 'pastaId' | 'pastaNome' | 'pastaCor'
  >,
): Promise<AutoSlideResult> {
  const mensagemData = estadoToMensagem(store);
  const esbocoVazio = !mensagemData.esboco || mensagemData.esboco.trim() === '';

  const mensagem = novaMensagem(mensagemData);

  // Gera slides
  let slides: ReturnType<typeof gerarSlides>['slides'];
  if (esbocoVazio) {
    slides = gerarSlidesMinimos({
      titulo: mensagemData.titulo,
      textoBase: mensagemData.textoBase,
      livroBiblico: '',
      objetivo: mensagemData.objetivo,
      publico: mensagemData.publico,
      conclusao: mensagemData.conclusao,
      oracao: '',
    });
  } else {
    ({ slides } = gerarSlides({
      mensagem: {
        titulo: mensagemData.titulo ?? '',
        tema: mensagemData.tema ?? '',
        esboco: mensagemData.esboco ?? '',
        textoBase: mensagemData.textoBase ?? '',
        livroBiblico: '',
        versiculos: [],
        objetivo: mensagemData.objetivo ?? '',
        publico: mensagemData.publico ?? '',
        aplicacoes: [],
        conclusao: '',
        oracao: '',
      },
    }));
  }

  mensagem.slides = slides;
  mensagem.serie = store.pastaId ?? PASTA_AVULSA_ID;

  // Salva no IndexedDB
  await db.salvarMensagem(mensagem);

  return {
    mensagemId: mensagem.id,
    slidesCount: slides.length,
    pastaNome: store.pastaNome,
  };
}

/**
 * Versão leve — gera slides sem salvar no banco.
 * Útil para preview rápido antes de confirmar.
 */
export async function previewSlides(
  store: Pick<SessionContext,
    | 'titulo' | 'subtitulo' | 'tema' | 'objetivo'
    | 'textoBase' | 'publico' | 'serie'
    | 'introducao' | 'pontos' | 'conclusao'
    | 'resumo' | 'tempoEstimado' | 'conversaId'
    | 'pastaId' | 'pastaNome' | 'pastaCor'
  >,
): Promise<number> {
  const mensagemData = estadoToMensagem(store);
  const esbocoVazio = !mensagemData.esboco || mensagemData.esboco.trim() === '';

  if (esbocoVazio) {
    const slides = gerarSlidesMinimos({
      titulo: mensagemData.titulo ?? '',
      textoBase: mensagemData.textoBase ?? '',
      objetivo: mensagemData.objetivo ?? '',
      publico: mensagemData.publico ?? '',
      livroBiblico: '',
      conclusao: '',
      oracao: '',
    });
    return slides.length;
  }

  const { slides } = gerarSlides({
    mensagem: {
      titulo: mensagemData.titulo ?? '',
      tema: mensagemData.tema ?? '',
      esboco: mensagemData.esboco ?? '',
      textoBase: mensagemData.textoBase ?? '',
      livroBiblico: '',
      versiculos: [],
      objetivo: mensagemData.objetivo ?? '',
      publico: mensagemData.publico ?? '',
      aplicacoes: [],
      conclusao: mensagemData.conclusao ?? '',
      oracao: '',
    },
  });
  return slides.length;
}
