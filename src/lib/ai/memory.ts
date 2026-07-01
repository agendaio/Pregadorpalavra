/**
 * Memory — contexto de memória injetado automaticamente na conversa.
 *
 * Quando o usuário está montando um esboço, o estado atual da pregação
 * é enviado como contexto para a IA — assim ela sabe do que estamos
 * falando sem precisar repetir.
 */

import type { SessionContext } from '@/types/copilotOutline';

/**
 * Constrói o bloco de contexto de memória a ser injetado no system prompt.
 *
 * Formata o estado atual do CopilotOutline como uma seção do system prompt,
 * permitindo que a IA "lembre" do tema, texto-base, estrutura e histórico.
 */
export function construirContextoMemoria(ctx: SessionContext): string {
  const partes: string[] = [];

  // Só inclui se tiver algo relevante
  const temTitulo = ctx.titulo?.trim();
  const temTema = ctx.tema?.trim();
  const temTextoBase = ctx.textoBase?.trim();
  const temObjetivo = ctx.objetivo?.trim();
  const temPublico = ctx.publico?.trim();
  const temSerie = ctx.serie?.trim();
  const temIntroducao = ctx.introducao?.trim();
  const temPontos = ctx.pontos && ctx.pontos.length > 0;
  const temConclusao = ctx.conclusao?.trim();
  const temResumo = ctx.resumo?.trim();

  if (!temTitulo && !temTema && !temTextoBase && !temPontos) {
    return ''; // Nada ainda — contexto vazio
  }

  partes.push('# Contexto atual da pregação');
  partes.push('');

  if (temTitulo) {
    partes.push(`**Título:** ${ctx.titulo}`);
  }
  if (temSerie) {
    partes.push(`**Série:** ${ctx.serie}`);
  }
  if (temTextoBase) {
    partes.push(`**Texto Base:** ${ctx.textoBase}`);
  }
  if (temTema) {
    partes.push(`**Tema:** ${ctx.tema}`);
  }
  if (temObjetivo) {
    partes.push(`**Objetivo:** ${ctx.objetivo}`);
  }
  if (temPublico) {
    partes.push(`**Público-alvo:** ${ctx.publico}`);
  }
  if (temResumo) {
    partes.push(`**Resumo:** ${ctx.resumo}`);
  }

  if (temIntroducao) {
    partes.push('');
    partes.push('**Introdução:**');
    partes.push(ctx.introducao);
  }

  if (temPontos && ctx.pontos.length > 0) {
    partes.push('');
    partes.push('**Estrutura atual:**');
    ctx.pontos.forEach((ponto, i) => {
      partes.push(`${i + 1}. ${ponto.texto}`);
      if (ponto.subpontos.length > 0) {
        ponto.subpontos.forEach((sp, j) => {
          partes.push(`   ${String.fromCharCode(97 + j)}) ${sp}`); // a), b), c)...
        });
      }
      if (ponto.aplicacoes.length > 0) {
        partes.push('   Aplicações:');
        ponto.aplicacoes.forEach((app) => {
          partes.push(`   - ${app}`);
        });
      }
    });
  }

  if (temConclusao) {
    partes.push('');
    partes.push('**Conclusão:**');
    partes.push(ctx.conclusao);
  }

  if (ctx.tempoEstimado > 0) {
    partes.push('');
    partes.push(`**Tempo estimado:** ${ctx.tempoEstimado} minutos`);
  }

  partes.push('');
  partes.push(
    '> Use este contexto automaticamente. Quando o usuário se referir a "o tema", "o segundo ponto", "a introdução", você sabe do que ele está falando.',
  );

  return partes.join('\n');
}

/**
 * Versão compacta do contexto para logs/debug.
 */
export function contextoResumo(ctx: SessionContext): string {
  const partes: string[] = [];
  if (ctx.titulo) partes.push(`tit="${ctx.titulo}"`);
  if (ctx.tema) partes.push(`tema="${ctx.tema}"`);
  if (ctx.textoBase) partes.push(`txt="${ctx.textoBase}"`);
  if (ctx.pontos?.length) partes.push(`pts=${ctx.pontos.length}`);
  return partes.join(' ');
}
