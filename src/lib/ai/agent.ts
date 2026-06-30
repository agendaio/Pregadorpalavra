import type { Mensagem } from '@/types/mensagem';
import { contextoMensagem } from './index';
import type { ChatMessage } from './provider';
import { SYSTEM_PROMPT, CONTEXT_INSTRUCTION } from './prompt';

/**
 * Agente — Assistente Ministerial.
 *
 * Responsabilidades:
 *  - Construir o array de mensagens com system prompt + contexto
 *  - Manter a memória da conversa (sessão)
 *  - Decidir se vale a pena chamar API ou usar cache
 *  - Injetar automaticamente o contexto da mensagem em edição
 */

/** Resumo de mensagens antigas para otimizar tokens */
function resumirMensagens(msgs: ChatMessage[]): ChatMessage {
  const ultimas = msgs.slice(-6);
  const total = msgs.length;
  if (total <= ultimas.length) {
    return { role: 'system', content: '', timestamp: 0 };
  }
  return {
    role: 'system',
    timestamp: 0,
    content:
      `[Resumo automático] Esta conversa teve ${total} mensagens. ` +
      `Foco nas últimas ${ultimas.length} trocas. ` +
      `Os pedidos anteriores estão consolidados no contexto atual da mensagem.`,
  };
}

export function construirMensagens(
  historico: ChatMessage[],
  mensagemContexto: Mensagem | null,
  systemAppend?: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // 1. System prompt base
  messages.push({ role: 'system', content: SYSTEM_PROMPT, timestamp: 0 });

  // 2. Contexto da mensagem em edição (se houver)
  if (mensagemContexto) {
    const ctx = contextoMensagem(mensagemContexto);
    messages.push({
      role: 'system',
      content: CONTEXT_INSTRUCTION + ctx,
      timestamp: 0,
    });
  }

  // 3. Resumo automático se conversa muito longa (otimização de tokens)
  if (historico.length > 20) {
    const sumario = resumirMensagens(historico);
    if (sumario.content) messages.push(sumario);
  }

  // 4. System append (instruções extras do usuário/ação)
  if (systemAppend) {
    messages.push({ role: 'system', content: systemAppend, timestamp: 0 });
  }

  // 5. Histórico recente (últimas N mensagens)
  const recentes = historico.slice(-20);
  for (const m of recentes) messages.push(m);

  return messages;
}

/** System appends específicos por ação do painel lateral */
export const SYSTEM_APPENDS: Record<string, string> = {
  esboco:
    'O usuário quer um ESBOÇO estruturado. Ofereça 2 ou 3 opções de estrutura (expositiva, temática, textual) com pontos bem marcados e tempo sugerido. Use formato markdown com títulos e listas.',
  ilustracoes:
    'O usuário quer ILUSTRAÇÕES. Ofereça 3 ilustrações curtas, concretas e originais. Cada uma com aplicação prática explícita.',
  aplicacoes:
    'O usuário quer APLICAÇÕES PRÁTICAS. Ofereça em 3 níveis (pessoal, relacional, comunitária). Cada aplicação deve ser específica, mensurável e executável em até 7 dias.',
  cruzamentos:
    'O usuário quer REFERÊNCIAS CRUZADAS. Ofereça uma seleção equilibrada de AT e NT, com conexões claras com o texto principal. Indique 2-3 obrigatórias e outras opcionais.',
  perguntas:
    'O usuário quer PERGUNTAS PARA GRUPO. Ofereça perguntas abertas, provocativas, sem moralismo. Devem facilitar discussão em célula ou pequeno grupo.',
  contextualizar:
    'O usuário quer CONTEXTO HISTÓRICO-CULTURAL. Cubra: quando, para quem, gênero literário, costumes e cenário. Seja preciso e indique quando houver debates acadêmicos.',
  resumir:
    'O usuário quer um RESUMO EXECUTIVO. Síntese em 6-8 tópicos curtos: tema, tese, estrutura, tempo, versículo-âncora, aplicação final.',
};

/** Gera título curto a partir da primeira mensagem */
export function gerarTitulo(primeiraMsg: string): string {
  const limpa = primeiraMsg.replace(/[^\w\sÀ-ÿ]/g, '').trim();
  const palavras = limpa.split(/\s+/).slice(0, 6).join(' ');
  return palavras.length > 48 ? palavras.slice(0, 45) + '…' : palavras;
}