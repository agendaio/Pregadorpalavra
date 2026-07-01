/**
 * Pregador OS — Modelo de domínio
 *
 * A Mensagem é o objeto central. Tudo orbita ela.
 * Cada campo existe por uma razão: organizar a vida ministerial do pregador.
 */

export type ID = string;

// ─── Tipos de Slide do Púlpito ──────────────────────────────────────────────

/** Tipos visuais disponíveis para slides do púlpito */
export type SlideType =
  | 'capa'
  | 'verso'
  | 'conteudo'
  | 'categorias'
  | 'chamada'
  | 'oracao';

/** Conteúdo de cada tipo de slide */
export type SlideContent =
  | SlideCapa
  | SlideVerso
  | SlideConteudo
  | SlideCategorias
  | SlideChamada
  | SlideOracao;

/** Capa — título + referência bíblica */
export interface SlideCapa {
  tipo: 'capa';
  titulo: string;
  referencia?: string;
  subtitulo?: string;
}

/** Verso bíblico — citação destacada */
export interface SlideVerso {
  tipo: 'verso';
  citacao: string;
  referencia: string;
  fundo?: string; // cor de fundo opcional
}

/** Conteúdo — título + N pontos numerados */
export interface SlideConteudo {
  tipo: 'conteudo';
  titulo: string;
  pontos: Array<{ numero: number; titulo: string; descricao: string }>;
}

/** Categorias — grid de cards (ex: Doença, Crise, Relacionamentos) */
export interface SlideCategorias {
  tipo: 'categorias';
  titulo: string;
  cards: Array<{ titulo: string; descricao: string; referencia?: string }>;
}

/** Chamada — texto livre + chamada para ação */
export interface SlideChamada {
  tipo: 'chamada';
  titulo: string;
  texto: string;
  cta?: string; // texto do botão (ex: "Vamos orar")
}

/** Oração — texto de oração final */
export interface SlideOracao {
  tipo: 'oracao';
  titulo?: string;
  texto: string;
}

/** Slide completo */
export interface Slide {
  id: string;
  tipo: SlideType;
  content: SlideContent;
}

export type AnexoTipo = 'imagem' | 'pdf' | 'audio' | 'video' | 'link' | 'arquivo';

export interface Anexo {
  id: ID;
  tipo: AnexoTipo;
  titulo: string;
  /** blob URL local, path Supabase Storage, ou URL externa */
  url: string;
  /** tamanho em bytes, quando aplicável */
  tamanho?: number;
  mime?: string;
  criadoEm: number;
}

export interface Versiculo {
  /** Ex: "Romanos", "8", "28-30" */
  livro: string;
  capitulo: string;
  versiculos: string;
  /** Texto completo do versículo (opcional) */
  texto?: string;
  /** Tradução preferida (NVI,ARA,ACF...) */
  versao?: string;
}

export interface Mensagem {
  id: ID;

  /** Identidade */
  titulo: string;
  /** Categoria macro: sermão, estudo, devocional, conferência... */
  categoria?: string;

  /** Contexto */
  tema: string;
  textoBase: string;
  objetivo: string;
  publico: string;
  ocasiao: string;
  serie?: string | null;
  livroBiblico: string;
  personagens: string[];

  /** Conteúdo bíblico */
  versiculos: Versiculo[];
  referenciasCruzadas: string[];

  /** Corpo do estudo */
  comentarios: string;
  contextoHistorico: string;
  aplicacoes: string[];
  ilustracoes: string[];
  testemunhos: string[];
  frasesMarcantes: string[];
  perguntas: string[];
  desafios: string[];
  dinamica: string;
  oracao: string;
  conclusao: string;

  /** Praticidade */
  /** Tempo estimado de ministração em minutos */
  tempoEstimado: number;
  observacoes: string;

  /** Conteúdo rico (Tiptap JSON serializado em string) */
  esboco: string;
  conteudo: string;

  /** Slides do púlpito (layout tipo PowerPoint) */
  slides: Slide[];

  /** Anexos */
  arquivos: Anexo[];

  /** Metadados */
  /** Igreja ou evento onde foi/será pregada */
  igreja?: string;
  dataPregacao?: number | null;
  tags: string[];
  favorita: boolean;
  status: 'rascunho' | 'pronta' | 'pregada' | 'arquivada';

  /** Controle de versão e sync */
  versao: number;
  criadoEm: number;
  atualizadoEm: number;
  /** ID do dispositivo que criou (preparado para sync futuro) */
  deviceId?: string;
}

/** Snapshot histórico de uma mensagem (sem os anexos binários) */
export interface MensagemHistorico {
  id: ID;
  mensagemId: ID;
  versao: number;
  snapshot: Omit<Mensagem, 'arquivos'> & { arquivos: AnexoResumo[] };
  criadoEm: number;
}

export interface AnexoResumo {
  id: ID;
  tipo: AnexoTipo;
  titulo: string;
}

export interface Serie {
  id: ID;
  nome: string;
  descricao?: string;
  cor?: string;
  /** IDs das mensagens que pertencem à série */
  mensagemIds: ID[];
  criadoEm: number;
  atualizadoEm: number;
}

export interface Tag {
  id: ID;
  nome: string;
  cor?: string;
}

/** Helpers de criação */
export const novaMensagem = (parcial: Partial<Mensagem> = {}): Mensagem => ({
  id: crypto.randomUUID(),
  titulo: parcial.titulo ?? '',
  categoria: parcial.categoria ?? 'sermão',
  tema: parcial.tema ?? '',
  textoBase: parcial.textoBase ?? '',
  objetivo: parcial.objetivo ?? '',
  publico: parcial.publico ?? '',
  ocasiao: parcial.ocasiao ?? '',
  serie: parcial.serie ?? null,
  livroBiblico: parcial.livroBiblico ?? '',
  personagens: parcial.personagens ?? [],
  versiculos: parcial.versiculos ?? [],
  referenciasCruzadas: parcial.referenciasCruzadas ?? [],
  comentarios: parcial.comentarios ?? '',
  contextoHistorico: parcial.contextoHistorico ?? '',
  aplicacoes: parcial.aplicacoes ?? [],
  ilustracoes: parcial.ilustracoes ?? [],
  testemunhos: parcial.testemunhos ?? [],
  frasesMarcantes: parcial.frasesMarcantes ?? [],
  perguntas: parcial.perguntas ?? [],
  desafios: parcial.desafios ?? [],
  dinamica: parcial.dinamica ?? '',
  oracao: parcial.oracao ?? '',
  conclusao: parcial.conclusao ?? '',
  tempoEstimado: parcial.tempoEstimado ?? 30,
  observacoes: parcial.observacoes ?? '',
  esboco: parcial.esboco ?? '',
  conteudo: parcial.conteudo ?? '',
  slides: parcial.slides ?? [],
  arquivos: parcial.arquivos ?? [],
  igreja: parcial.igreja,
  dataPregacao: parcial.dataPregacao ?? null,
  tags: parcial.tags ?? [],
  favorita: parcial.favorita ?? false,
  status: parcial.status ?? 'rascunho',
  versao: parcial.versao ?? 1,
  criadoEm: Date.now(),
  atualizadoEm: Date.now(),
});