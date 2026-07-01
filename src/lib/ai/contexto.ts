import type { Mensagem } from '@/types/mensagem';

/**
 * Monta o contexto textual completo de uma mensagem pra ser
 * enviado ao Assistente. É injetado automaticamente no system prompt
 * em toda chamada — o usuário não precisa repetir essas informações.
 */
export function contextoMensagem(m: Mensagem): string {
  const partes: string[] = [];
  if (m.titulo) partes.push(`Título: ${m.titulo}`);
  if (m.tema) partes.push(`Tema: ${m.tema}`);
  if (m.textoBase) partes.push(`Texto-base: ${m.textoBase}`);
  if (m.livroBiblico) partes.push(`Livro bíblico: ${m.livroBiblico}`);
  if (m.objetivo) partes.push(`Objetivo: ${m.objetivo}`);
  if (m.publico) partes.push(`Público: ${m.publico}`);
  if (m.ocasiao) partes.push(`Ocasião: ${m.ocasiao}`);
  if (m.serie) partes.push(`Série: ${m.serie}`);
  if (m.personagens.length) partes.push(`Personagens: ${m.personagens.join(', ')}`);
  if (m.versiculos.length) {
    partes.push(
      `Versículos:\n${m.versiculos
        .map((v) => `- ${v.livro} ${v.capitulo}:${v.versiculos}${v.texto ? ` — "${v.texto}"` : ''}`)
        .join('\n')}`,
    );
  }
  if (m.referenciasCruzadas.length)
    partes.push(`Referências cruzadas mencionadas: ${m.referenciasCruzadas.join(', ')}`);
  if (m.contextoHistorico) partes.push(`Contexto histórico registrado: ${m.contextoHistorico}`);
  if (m.comentarios) partes.push(`Comentários do pregador: ${m.comentarios}`);
  if (m.esboco) partes.push(`Esboço atual:\n${m.esboco.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
  if (m.tempoEstimado) partes.push(`Tempo estimado: ${m.tempoEstimado} min`);
  return partes.join('\n\n');
}