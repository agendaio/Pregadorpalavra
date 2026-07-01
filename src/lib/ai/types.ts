/**
 * Tipos e ações rápidas do Assistente Ministerial
 * (usadas pelo AIPanel no editor e pela página do Assistente)
 */

export type AcaoIA =
  | 'esboco'
  | 'ilustracoes'
  | 'aplicacoes'
  | 'cruzamentos'
  | 'perguntas'
  | 'contextualizar'
  | 'resumir';

export interface MensagemIA {
  id: string;
  acao: AcaoIA;
  /** conteúdo markdown-like (sem HTML pesado) */
  conteudo: string;
  /** referências bíblicas citadas */
  referencias: string[];
  criadoEm: number;
}

export const ACOES_IA: { id: AcaoIA; rotulo: string; descricao: string }[] = [
  { id: 'esboco', rotulo: 'Esboço', descricao: 'Estrutura em 3 pontos com tempo' },
  { id: 'ilustracoes', rotulo: 'Ilustrações', descricao: '3 ilustrações concretas' },
  { id: 'aplicacoes', rotulo: 'Aplicações', descricao: 'Pessoal, relacional, comunitária' },
  { id: 'cruzamentos', rotulo: 'Cruzamentos', descricao: 'AT + NT com conexões' },
  { id: 'perguntas', rotulo: 'Perguntas', descricao: 'Para diálogo na congregação' },
  { id: 'contextualizar', rotulo: 'Contexto', descricao: 'Cenário histórico-cultural' },
  { id: 'resumir', rotulo: 'Resumir', descricao: 'Síntese executiva da mensagem' },
];