import type { Mensagem } from '@/types/mensagem';
import { htmlParaTexto } from './utils';

/**
 * Cliente de IA do Pregador OS.
 *
 * Por enquanto: gerador local com templates estruturados que produzem
 * conteúdo real a partir do contexto da mensagem (esboço, ilustrações,
 * cruzamentos, aplicações, perguntas).
 *
 * Quando o backend (OpenAI/Anthropic) estiver conectado via Edge Function,
 * basta trocar a implementação de `chamarIA` mantendo a mesma assinatura.
 *
 * Princípios:
 * - Sempre cita a referência bíblica quando produz aplicação.
 * - Diferencia fato / interpretação / aplicação.
 * - Incentiva estudo pessoal da Bíblia (sugere leituras adicionais).
 * - Nunca inventa dados factuais sem marcar como sugestão.
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

const SYSTEM_PROMPT = `Você é o assistente teológico do Pregador OS.
Sempre responda em português.
Diferencie claramente: FATO bíblico / INTERPRETAÇÃO teológica / APLICAÇÃO prática.
Cite a referência completa de cada versículo usado (Livro Cap:Vv).
Quando usar comentário ou fonte, indique (ex: "Comentário de Matthew Henry").
Nunca invente dados factuais sem marcar como "sugestão do assistente".
Sempre incentive o estudo pessoal: sugira ler o capítulo inteiro, conferir o original no Hebraico/Grego quando relevante.
Tom: pastoral, sóbrio, erudito sem ser pedante.`;

/** Monta o contexto da mensagem para a IA */
export function contextoMensagem(m: Mensagem): string {
  const partes: string[] = [];
  if (m.titulo) partes.push(`Título: ${m.titulo}`);
  if (m.tema) partes.push(`Tema: ${m.tema}`);
  if (m.textoBase) partes.push(`Texto-base: ${m.textoBase}`);
  if (m.livroBiblico) partes.push(`Livro bíblico: ${m.livroBiblico}`);
  if (m.objetivo) partes.push(`Objetivo: ${m.objetivo}`);
  if (m.publico) partes.push(`Público: ${m.publico}`);
  if (m.ocasiao) partes.push(`Ocasião: ${m.ocasiao}`);
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
  if (m.esboco) partes.push(`Esboço atual:\n${htmlParaTexto(m.esboco)}`);
  if (m.tempoEstimado) partes.push(`Tempo estimado: ${m.tempoEstimado} min`);
  return partes.join('\n\n');
}

/**
 * Implementação local (stub inteligente).
 *
 * Em produção, isto chama a Edge Function que fala com OpenAI/Anthropic
 * passando o contexto da mensagem. Por enquanto, geramos respostas
 * estruturadas que parecem reais e servem como demonstração da UX.
 */
async function chamarIA(
  mensagem: Mensagem,
  acao: AcaoIA,
  extra?: string,
): Promise<MensagemIA> {
  // delay simulado pra UX parecer real
  await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));

  const refs = mensagem.versiculos.map((v) => `${v.livro} ${v.capitulo}:${v.versiculos}`);
  const livro = mensagem.livroBiblico || 'o texto';

  let conteudo = '';

  switch (acao) {
    case 'esboco':
      conteudo = gerarEsboco(mensagem, livro, refs);
      break;
    case 'ilustracoes':
      conteudo = gerarIlustracoes(mensagem, livro);
      break;
    case 'aplicacoes':
      conteudo = gerarAplicacoes(mensagem, livro, refs);
      break;
    case 'cruzamentos':
      conteudo = gerarCruzamentos(mensagem, refs);
      break;
    case 'perguntas':
      conteudo = gerarPerguntas(mensagem, livro);
      break;
    case 'contextualizar':
      conteudo = gerarContexto(mensagem, livro);
      break;
    case 'resumir':
      conteudo = gerarResumo(mensagem, livro);
      break;
  }

  if (extra) conteudo += `\n\n**Pedido adicional:** ${extra}`;

  return {
    id: crypto.randomUUID(),
    acao,
    conteudo,
    referencias: refs,
    criadoEm: Date.now(),
  };
}

function gerarEsboco(m: Mensagem, livro: string, refs: string[]): string {
  const ref = refs[0] ?? `${livro} (texto-base)`;
  return `**Esboço sugerido (3 pontos, ${m.tempoEstimado || 30} min)**\n\n` +
    `**1. O contexto revela o coração**\n` +
    `A passagem em ${ref} abre com uma situação concreta que toca a realidade do ouvinte. ` +
    `[INTERPRETAÇÃO] O autor sagrado usa esse cenário para expor uma tensão entre o visível e o invisível. ` +
    `[APLICAÇÃO] Convidar a congregação a reconhecer a mesma tensão na própria história.\n\n` +
    `**2. A verdade central se desdobra**\n` +
    `[FATO] O texto apresenta três movimentos que sustentam a tese principal. ` +
    `[INTERPRETAÇÃO] Cada movimento responde a uma objeção possível do ouvinte. ` +
    `[APLICAÇÃO] Mostrar como esses movimentos se aplicam a três esferas da vida: pessoal, relacional, comunitária.\n\n` +
    `**3. A resposta exige decisão**\n` +
    `[APLICAÇÃO] Encerrar com um chamado concreto, simples e executável na próxima semana.\n\n` +
    `*Sugestão: ler o capítulo inteiro de ${livro} antes de pregar para captar o fluxo.*`;
}

function gerarIlustracoes(_m: Mensagem, livro: string): string {
  return `**3 ilustrações possíveis**\n\n` +
    `**Ilustração 1 — O navegador e a bússola**\n` +
    `Um marinheiro experiente confia mais na bússola do que nas ondas. A Palavra funciona como bússola em meio às circunstâncias. ` +
    `[APLICAÇÃO] Assim como a bússola não elimina a tempestade, a Palavra não elimina a dificuldade — ela dá direção.\n\n` +
    `**Ilustração 2 — A planta na janela**\n` +
    `Uma planta busca luz mesmo inclinada para o lado errado. [INTERPRETAÇÃO] Mesmo distorcido, o instinto de buscar a luz permanece. ` +
    `[APLICAÇÃO] O ser humano busca sentido mesmo quando sua rota está errada. A graça corrige a rota sem matar o instinto.\n\n` +
    `**Ilustração 3 — O espelho e a janela**\n` +
    `Olhamos pela janela para ver o mundo e no espelho para ver a nós mesmos. [INTERPRETAÇÃO] O texto de ${livro} ora é janela (revelação de Deus), ora é espelho (revelação de nós). ` +
    `[APLICAÇÃO] Ensinar o ouvinte a perguntar em cada passagem: o que isso me revela sobre Deus? O que isso me revela sobre mim?\n\n` +
    `*Lembrete: ilustração boa é curta, concreta e não rouba o centro do sermão.*`;
}

function gerarAplicacoes(_m: Mensagem, livro: string, refs: string[]): string {
  const ref = refs[0] ?? livro;
  return `**Aplicações práticas (3 níveis)**\n\n` +
    `**Pessoal**\n` +
    `• Reservar 10 min diários para reler ${ref} em outra tradução.\n` +
    `• Escrever em uma única frase: "Hoje, Deus me chama a ____".\n` +
    `• Identificar um pensamento repetido na semana que precisa ser confrontado pelo texto.\n\n` +
    `**Relacional**\n` +
    `• Escolher uma pessoa para compartilhar o que Deus falou nesta semana.\n` +
    `• Praticar uma escuta ativa de 5 min com alguém próximo sem interromper.\n\n` +
    `**Comunitária**\n` +
    `• Propor à célula/grupo de comunhão uma pergunta do sermão para Discussão.\n` +
    `• Identificar uma necessidade concreta da igreja local onde a mensagem pode virar ação.\n\n` +
    `*Cada aplicação deve ser específica, mensurável e executável em até 7 dias.*`;
}

function gerarCruzamentos(m: Mensagem, refs: string[]): string {
  const principal = refs[0] ?? 'o texto-base';
  return `**Referências cruzadas relevantes**\n\n` +
    `**Antigo Testamento**\n` +
    `• Salmos 119:105 — "Lâmpada para os meus pés é a tua palavra." (conexão: a Palavra como direção)\n` +
    `• Provérbios 3:5-6 — confiar de todo o coração. (conexão temática com ${principal})\n` +
    `• Isaías 55:10-11 — a Palavra que não volta vazia. (conexão: poder da Palavra)\n\n` +
    `**Novo Testamento**\n` +
    `• Tiago 1:22-25 — ouvir e praticar. (conexão: aplicação prática)\n` +
    `• João 17:17 — santificação pela verdade. (conexão: efeito da Palavra no crente)\n` +
    `• Hebreus 4:12 — viva e eficaz. (conexão: poder penetrante)\n\n` +
    `**Sugestão para o pregador:** ler essas passagens em sequência e identificar o fio condutor. ` +
    `Não cite todas no sermão — escolha 2 ou 3 que reforçam o ponto principal.\n\n` +
    `*Sugestão do assistente — confirme as conexões com seu próprio estudo antes de pregar.*`;
}

function gerarPerguntas(_m: Mensagem, livro: string): string {
  return `**Perguntas para abrir diálogo na congregação**\n\n` +
    `1. Quando você lê ${livro}, qual palavra ou frase mais te chama atenção? Por quê?\n` +
    `2. Existe algo nesta passagem que te incomoda ou desafia?\n` +
    `3. Como o texto se conecta com algo que você viveu nesta semana?\n` +
    `4. Se este texto fosse uma carta pessoal para você hoje, qual seria a frase de abertura?\n` +
    `5. Que mentira esse texto quebra? Que verdade ele estabelece?\n\n` +
    `**Pergunta central para a célula/grupo pequeno após o sermão:**\n` +
    `"O que impede este texto de produzir efeito real na minha vida esta semana?"`;
}

function gerarContexto(m: Mensagem, livro: string): string {
  return `**Contexto histórico-cultural**\n\n` +
    `**Quando:** o livro de ${livro} foi escrito em um período marcado por [verificar datação no estudo pessoal]. ` +
    `**Para quem:** a audiência original enfrentava [verificar perfil da audiência original]. ` +
    `**Gênero literário:** [verificar — narrativa, poesia, epístola, profecia, apocalíptico]. ` +
    `**Costumes e cenário:** [verificar elementos geográficos, sociais e religiosos do período].\n\n` +
    `[INTERPRETAÇÃO] Compreender o cenário original evita anacronismo e protege a exegese de aplicações forçadas.\n\n` +
    `[APLICAÇÃO] Compartilhe 1 ou 2 elementos do cenário original que aproximam o ouvinte do mundo do texto — sem virar aula de história.\n\n` +
    `*Fontes sugeridas para estudo adicional: Dicionário Bíblico Vine, Comentário de Matthew Henry, Atlas Bíblico.*`;
}

function gerarResumo(_m: Mensagem, livro: string): string {
  return `**Resumo executivo**\n\n` +
    `• **Tema central:** a passagem de ${livro} revela [preencha após o estudo].\n` +
    `• **Tese:** [elabore uma frase-síntese de toda a mensagem].\n` +
    `• **Estrutura:** 3 pontos com progressão lógica (contexto → revelação → aplicação).\n` +
    `• **Tempo ideal:** distribuir proporcionalmente — 25% contexto, 50% revelação, 25% aplicação.\n` +
    `• **Versículo-âncora:** o versículo mais forte da passagem, repetido na conclusão.\n` +
    `• **Aplicação final:** uma única ação concreta, mensurável, executável em 7 dias.\n\n` +
    `*Sugestão do assistente — refine com seu próprio estudo.*`;
}

/** API pública */
export async function gerarParaMensagem(
  mensagem: Mensagem,
  acao: AcaoIA,
  extra?: string,
): Promise<MensagemIA> {
  return chamarIA(mensagem, acao, extra);
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

export { SYSTEM_PROMPT };