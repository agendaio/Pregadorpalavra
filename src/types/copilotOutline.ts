/**
 * CopilotOutline — tipos TypeScript para o esboço de pregação
 * que é montado automaticamente enquanto o usuário conversa com a IA.
 */

export interface PontoEsboço {
  id: string;
  texto: string;
  subpontos: string[];
  aplicacoes: string[];
}

export interface SessionContext {
  titulo: string;
  subtitulo: string;
  tema: string;
  objetivo: string;
  textoBase: string;
  publico: string;
  serie: string;
  introducao: string;
  pontos: PontoEsboço[];
  conclusao: string;
  resumo: string;
  tempoEstimado: number;
  conversaId: string;
  /** Pasta de esboço selecionada */
  pastaId: string | null;
  pastaNome: string | null;
  pastaCor: string | null;
}

/** Tipos de ação disponíveis no menu de seleção de texto */
export type SeleçãoAção =
  | 'adicionar_esboco'
  | 'adicionar_introducao'
  | 'adicionar_ponto'
  | 'adicionar_subponto'
  | 'adicionar_aplicacao'
  | 'adicionar_ilustracao'
  | 'adicionar_conclusao'
  | 'adicionar_referencia'
  | 'copiar'
  | 'editar'
  | 'reescrever'
  | 'expandir'
  | 'compartilhar'
  | 'favoritar';

export interface SeleçãoAçãoMeta {
  id: SeleçãoAção;
  label: string;
  icon: string;
  group: 'outline' | 'content' | 'utility';
}

export const SELEÇÃO_AÇÕES: SeleçãoAçãoMeta[] = [
  { id: 'adicionar_esboco', label: 'Adicionar ao Esboço', icon: '📋', group: 'outline' },
  { id: 'adicionar_introducao', label: 'Adicionar como Introdução', icon: '📖', group: 'outline' },
  { id: 'adicionar_ponto', label: 'Adicionar como Ponto', icon: '1️⃣', group: 'outline' },
  { id: 'adicionar_subponto', label: 'Adicionar como Subponto', icon: '2️⃣', group: 'outline' },
  { id: 'adicionar_aplicacao', label: 'Adicionar Aplicação', icon: '✅', group: 'outline' },
  { id: 'adicionar_ilustracao', label: 'Adicionar Ilustração', icon: '💡', group: 'outline' },
  { id: 'adicionar_conclusao', label: 'Adicionar como Conclusão', icon: '🏁', group: 'outline' },
  { id: 'adicionar_referencia', label: 'Adicionar Referência', icon: '📚', group: 'outline' },
  { id: 'copiar', label: 'Copiar', icon: '📋', group: 'utility' },
  { id: 'editar', label: 'Editar', icon: '✏️', group: 'content' },
  { id: 'reescrever', label: 'Reescrever', icon: '🔄', group: 'content' },
  { id: 'expandir', label: 'Expandir', icon: '📖', group: 'content' },
  { id: 'compartilhar', label: 'Compartilhar', icon: '🔗', group: 'utility' },
  { id: 'favoritar', label: 'Favoritar', icon: '⭐', group: 'utility' },
];

/** Contexto vazio para reset */
export const SESSÃO_VAZIA: SessionContext = {
  titulo: '',
  subtitulo: '',
  tema: '',
  objetivo: '',
  textoBase: '',
  publico: '',
  serie: '',
  introducao: '',
  pontos: [],
  conclusao: '',
  resumo: '',
  tempoEstimado: 30,
  conversaId: '',
  pastaId: null,
  pastaNome: null,
  pastaCor: null,
};
