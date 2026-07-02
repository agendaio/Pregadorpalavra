/**
 * SlideGenerator — Gera slides automaticamente a partir do esboço.
 *
 * Parsing inteligente:
 *  - Extrai capítulos (H1) como seções principais → slide de conteúdo
 *  - Detecta Introdução / Conclusão → trata diferente
 *  - Detecta categorias/temas → agrupa em slide de categorias
 *  - Cada slide gerado tem um estilo visual único e diferenciável
 *
 * Fluxo: Mensagem → parsearEsboco() → chapters → gerarSlides()
 */

import type {
  Slide,
  SlideType,
  SlideCapa,
  SlideVerso,
  SlideConteudo,
  SlideCategorias,
  SlideChamada,
  SlideOracao,
  Mensagem,
} from '@/types/mensagem';
import { parsearEsboco } from '@/lib/esbocoParser';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function novoSlide(tipo: SlideType): Slide {
  const id = crypto.randomUUID();
  const base = { id };
  switch (tipo) {
    case 'capa':
      return { ...base, tipo, content: { tipo: 'capa', titulo: '', referencia: '' } as SlideCapa };
    case 'verso':
      return { ...base, tipo, content: { tipo: 'verso', citacao: '', referencia: '' } as SlideVerso };
    case 'conteudo':
      return { ...base, tipo, content: { tipo: 'conteudo', titulo: '', pontos: [] } as SlideConteudo };
    case 'categorias':
      return { ...base, tipo, content: { tipo: 'categorias', titulo: '', cards: [] } as SlideCategorias };
    case 'chamada':
      return { ...base, tipo, content: { tipo: 'chamada', titulo: '', texto: '', cta: 'Vamos orar' } as SlideChamada };
    case 'oracao':
      return { ...base, tipo, content: { tipo: 'oracao', titulo: 'Oração Final', texto: '' } as SlideOracao };
  }
}

// ─── Classificação semântica dos capítulos ───────────────────────────────────

const RE_INTRO    = /^(intro|introdução|introducao|abertura|contextualização|contextualizacao)/i;
const RE_CONCL    = /^(conclus|conclusão|conclusao|fechamento|final|call\s*to\s*action|cta|apelo|reflexão|reflexao)/i;
const RE_APLIC    = /^(aplica|aplicação|aplicacao|desafio|encerramento|prática|pratica)/i;

type SecaoTipo = 'introducao' | 'conteudo' | 'aplicacao' | 'conclusao';

function classificarCapitulo(titulo: string): SecaoTipo {
  const t = (titulo || '').trim();
  if (RE_INTRO.test(t)) return 'introducao';
  if (RE_CONCL.test(t)) return 'conclusao';
  if (RE_APLIC.test(t)) return 'aplicacao';
  return 'conteudo';
}

// ─── Geração de slides por capítulo ──────────────────────────────────────────

/**
 * Gera slides de CONTEÚDO a partir de um capítulo.
 * Retorna null se o capítulo não tiver conteúdo válido.
 */
function gerarSlideDeCapitulo(capitulo: { titulo: string; blocos: { texto: string }[] }): Slide | null {
  // Extrai pontos: blocos que parecem bullet points ou listas (não subtítulos)
  const pontos = capitulo.blocos
    .map((b) => b.texto)
    .filter((t) => t.trim() && !t.startsWith('▌') && !t.startsWith('  ◦'));

  // Se não tem conteúdo real, não cria slide vazio
  if (pontos.length === 0) return null;

  const slide = novoSlide('conteudo') as Slide & { content: SlideConteudo };
  slide.content.titulo = capitulo.titulo;

  // Limita a 5 pontos por slide (legibilidade no púlpito)
  const pontosFiltrados = pontos.slice(0, 5);

  slide.content.pontos = pontosFiltrados.map((texto, i) => {
    // Tenta extrair título e descrição
    const partes = texto.split('—').map((s) => s.trim());
    return {
      numero: i + 1,
      titulo: partes[0] || texto,
      descricao: partes[1] || '',
    };
  });

  return slide;
}

// ─── Geração de slide de VERSO ──────────────────────────────────────────────

function gerarSlideDeVerso(mensagem: { textoBase?: string; livroBiblico?: string; versiculos?: unknown[] }): Slide | null {
  const referencia = mensagem.textoBase || mensagem.livroBiblico;
  if (!referencia) return null;

  const versiculo = mensagem.versiculos?.[0] as { texto?: string; livro?: string; capitulo?: string; versiculos?: string } | undefined;
  if (versiculo?.texto) {
    const slide = novoSlide('verso') as Slide & { content: SlideVerso };
    slide.content.citacao = versiculo.texto;
    slide.content.referencia = `${versiculo.livro} ${versiculo.capitulo}:${versiculo.versiculos}`;
    return slide;
  }

  return null;
}

// ─── Geração de slide de CATEGORIAS ─────────────────────────────────────────

function gerarSlideDeCategorias(mensagem: { tema?: string; versiculos?: unknown[] }, capitulos: ReturnType<typeof parsearEsboco>): Slide | null {
  // Agrupa capítulos que parecem categorias (temas diferentes)
  const titulosUnicos = capitulos
    .map((c) => c.titulo)
    .filter((t) => t && !RE_INTRO.test(t) && !RE_CONCL.test(t));

  if (titulosUnicos.length < 2) return null;

  const slide = novoSlide('categorias') as Slide & { content: SlideCategorias };
  slide.content.titulo = mensagem.tema || 'Temas da Mensagem';
  slide.content.cards = titulosUnicos.slice(0, 4).map((titulo) => ({
    titulo,
    descricao: '',
    referencia: '',
  }));

  return slide;
}

// ─── Geração de slide de CHAMADA ────────────────────────────────────────────

function gerarSlideDeChamada(mensagem: { objetivo?: string; publico?: string; aplicacoes?: string[] }): Slide {
  const slide = novoSlide('chamada') as Slide & { content: SlideChamada };
  slide.content.titulo = mensagem.objetivo || 'Aplicação';
  slide.content.texto = mensagem.aplicacoes?.[0] || mensagem.publico
    ? `Para: ${mensagem.publico}`
    : 'Que esta palavra toque profundamente os nossos corações.';
  slide.content.cta = 'Vamos orar';
  return slide;
}

// ─── MAIN: gerarSlides ──────────────────────────────────────────────────────

export interface GerarSlidesOptions {
  /** Mensagem fonte com esboco, título, texto base, etc. */
  mensagem: {
    titulo: string;
    esboco: string;
    textoBase?: string;
    livroBiblico?: string;
    versiculos?: unknown[];
    tema?: string;
    objetivo?: string;
    publico?: string;
    aplicacoes?: string[];
    conclusao?: string;
    oracao?: string;
  };
  /**
   * Se true, força regeneração (substitui todos os slides).
   * Se false (default), só gera se NÃO existirem slides.
   */
  forcar?: boolean;
}

export function gerarSlides(options: GerarSlidesOptions): { slides: Slide[]; gerados: number } {
  const { mensagem } = options;

  const chapters = parsearEsboco(mensagem.esboco || '');
  const slides: Slide[] = [];

  // ── 1. CAPA ──────────────────────────────────────────────────────────────
  const capa = novoSlide('capa') as Slide & { content: SlideCapa };
  capa.content.titulo = mensagem.titulo || 'Sem título';
  if (mensagem.textoBase) {
    capa.content.referencia = mensagem.textoBase;
  } else if (mensagem.livroBiblico) {
    capa.content.referencia = mensagem.livroBiblico;
  }
  slides.push(capa);

  // ── 2. VERSE (opcional) ────────────────────────────────────────────────
  const versoSlide = gerarSlideDeVerso(mensagem);
  if (versoSlide) slides.push(versoSlide);

  // ── 3. SLIDES DE CONTEÚDO por capítulo ─────────────────────────────────
  const capitulosNaoIntro = chapters.filter(
    (c) => !RE_INTRO.test(c.titulo) && !RE_CONCL.test(c.titulo),
  );

  if (capitulosNaoIntro.length > 0) {
    // Se tiver 2-4 capítulos, cada um vira um slide de conteúdo
    if (capitulosNaoIntro.length <= 4) {
      capitulosNaoIntro.forEach((cap) => {
        const slide = gerarSlideDeCapitulo(cap);
        if (slide) slides.push(slide);
      });
    } else {
      // Se tiver muitos, agrupa em blocos de ~3 por slide
      for (let i = 0; i < capitulosNaoIntro.length; i += 3) {
        const grupo = capitulosNaoIntro.slice(i, i + 3);
        const slide = novoSlide('conteudo') as Slide & { content: SlideConteudo };
        slide.content.titulo = grupo[0].titulo;

        const pontos = grupo.flatMap((cap) =>
          cap.blocos
            .map((b) => b.texto)
            .filter((t) => t.trim() && !t.startsWith('▌') && !t.startsWith('  ◦'))
            .slice(0, 3),
        );

        // Se não tem pontos reais, não cria slide vazio
        if (pontos.length === 0) continue;

        slide.content.pontos = pontos.map((texto, idx) => ({
          numero: idx + 1,
          titulo: texto.split('—')[0].trim(),
          descricao: texto.split('—')[1]?.trim() || '',
        }));

        slides.push(slide);
      }
    }
  }

  // ── 4. APLICAÇÃO (se tiver) ───────────────────────────────────────────
  const aplicacaoCap = chapters.find((c) => RE_APLIC.test(c.titulo));
  if (aplicacaoCap) {
    const slide = gerarSlideDeCapitulo(aplicacaoCap);
    if (slide) slides.push(slide);
  }

  // ── 5. CATEGORIAS (se fizer sentido) ───────────────────────────────────
  const categoriasSlide = gerarSlideDeCategorias(mensagem, chapters);
  if (categoriasSlide) slides.push(categoriasSlide);

  // ── 6. CHAMADA ──────────────────────────────────────────────────────────
  slides.push(gerarSlideDeChamada(mensagem));

  // ── 7. ORAÇÃO FINAL ────────────────────────────────────────────────────
  const oracao = novoSlide('oracao') as Slide & { content: SlideOracao };
  if (mensagem.oracao) {
    oracao.content.titulo = 'Oração Final';
    oracao.content.texto = mensagem.oracao;
  } else {
    oracao.content.titulo = 'Oração';
    oracao.content.texto = mensagem.conclusao
      ? mensagem.conclusao.slice(0, 300)
      : 'Senhor, que a Tua Palavra seja luz nos nossos caminhos. Amém.';
  }
  slides.push(oracao);

  return { slides, gerados: slides.length };
}

/**
 * Versão simplificada que gera slides mínimos (capa + chamada + oração).
 * Usada quando o esboco está vazio.
 */
export function gerarSlidesMinimos(mensagem: {
  titulo: string;
  textoBase?: string;
  livroBiblico?: string;
  objetivo?: string;
  publico?: string;
  conclusao?: string;
  oracao?: string;
}): Slide[] {
  const slides: Slide[] = [];

  // Capa
  const capa = novoSlide('capa') as Slide & { content: SlideCapa };
  capa.content.titulo = mensagem.titulo || 'Sem título';
  capa.content.referencia = mensagem.textoBase || mensagem.livroBiblico || '';
  slides.push(capa);

  // Chamada
  const chamada = novoSlide('chamada') as Slide & { content: SlideChamada };
  chamada.content.titulo = mensagem.objetivo || 'Ministração';
  chamada.content.texto = mensagem.publico ? `Para: ${mensagem.publico}` : '';
  chamada.content.cta = 'Vamos orar';
  slides.push(chamada);

  // Oração
  const oracao = novoSlide('oracao') as Slide & { content: SlideOracao };
  oracao.content.titulo = 'Oração';
  oracao.content.texto = mensagem.conclusao
    ? mensagem.conclusao.slice(0, 300)
    : mensagem.oracao || 'Senhor, que a Tua Palavra seja luz nos nossos caminhos. Amém.';
  slides.push(oracao);

  return slides;
}
