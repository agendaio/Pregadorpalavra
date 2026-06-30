/**
 * Pregador OS — Camada de IA
 *
 * Barrel exports. Toda a lógica vive em ./ai/.
 * Mantemos `contextoMensagem` aqui pra compat com o seed.ts.
 */

export type { AcaoIA, MensagemIA } from './types';
export { ACOES_IA } from './types';
export { contextoMensagem } from './contexto';

// Camada de abstração
export type {
  AIProvider,
  AIRequest,
  AIResponse,
  ChatMessage,
  ProviderInfo,
  ModeloInfo,
} from './provider';
export { AIError } from './provider';

// Providers
export { openaiProvider, OpenAIProvider, MODELOS as OPENAI_MODELOS, CHAVE_STORAGE, MODELO_STORAGE } from './openai';
export { localProvider, LocalProvider } from './local';

// Roteamento
export {
  obterProviderAtivoId,
  definirProviderAtivo,
  listarProviders,
  obterProvider,
  enviarComFallback,
} from './router';
export type { ProviderId } from './router';

// Sessão, memória, cache
export {
  aiDB,
  obterOuCriarSessao,
  listarMensagens,
  adicionarMensagem,
  limparSessao,
  buscarCache,
  guardarCache,
  incrementarReutilizacao,
  obterStats,
  registrarUso,
  hashInput,
} from './session';
export type { Sessao, MensagemPersistida, CacheResposta, StatsIA } from './session';

// Agente
export { construirMensagens, gerarTitulo, SYSTEM_APPENDS } from './agent';
export { SYSTEM_PROMPT } from './prompt';