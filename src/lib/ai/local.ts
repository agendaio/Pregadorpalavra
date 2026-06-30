import type {
  AIProvider,
  AIRequest,
  AIResponse,
  ProviderInfo,
  ModeloInfo,
} from './provider';
import { SYSTEM_PROMPT, CONTEXT_INSTRUCTION } from './prompt';
import { contextoMensagem } from '../ai';
import type { Mensagem } from '@/types/mensagem';

/**
 * Provider Local — funciona offline, sem custo.
 *
 * Usa templates estruturados pré-definidos para gerar conteúdo útil
 * a partir do contexto da mensagem. Não é IA generativa real, mas
 * é um excelente fallback quando:
 *   - não há chave de API configurada
 *   - o usuário está offline
 *   - o provedor principal falhou
 *
 * Quando o backend OpenAI estiver conectado, a camada de roteamento
 * seleciona automaticamente o provider com base na config + estado da rede.
 */

const ACOES: { id: string; rotulo: string; padrao: (ctx: string, msg: Mensagem) => string }[] = [
  {
    id: 'esboco',
    rotulo: 'Esboço',
    padrao: (ctx, m) => esbocoPadrao(m),
  },
  {
    id: 'ilustracoes',
    rotulo: 'Ilustrações',
    padrao: (ctx, m) => ilustracoesPadrao(m),
  },
  {
    id: 'aplicacoes',
    rotulo: 'Aplicações',
    padrao: () => aplicacoesPadrao(),
  },
  {
    id: 'cruzamentos',
    rotulo: 'Cruzamentos',
    padrao: () => cruzamentosPadrao(),
  },
  {
    id: 'perguntas',
    rotulo: 'Perguntas',
    padrao: () => perguntasPadrao(),
  },
  {
    id: 'contextualizar',
    rotulo: 'Contexto',
    padrao: (ctx, m) => contextoPadrao(m),
  },
  {
    id: 'resumir',
    rotulo: 'Resumir',
    padrao: () => resumoPadrao(),
  },
];

function esbocoPadrao(m: Mensagem): string {
  const livro = m.livroBiblico || 'o texto';
  const ref = m.textoBase || livro;
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

function ilustracoesPadrao(_m: Mensagem): string {
  return `**3 ilustrações possíveis**\n\n` +
    `**Ilustração 1 — O navegador e a bússola**\n` +
    `Um marinheiro experiente confia mais na bússola do que nas ondas. A Palavra funciona como bússola em meio às circunstâncias. ` +
    `[APLICAÇÃO] Assim como a bússola não elimina a tempestade, a Palavra não elimina a dificuldade — ela dá direção.\n\n` +
    `**Ilustração 2 — A planta na janela**\n` +
    `Uma planta busca luz mesmo inclinada para o lado errado. [INTERPRETAÇÃO] Mesmo distorcido, o instinto de buscar a luz permanece. ` +
    `[APLICAÇÃO] O ser humano busca sentido mesmo quando sua rota está errada. A graça corrige a rota sem matar o instinto.\n\n` +
    `**Ilustração 3 — O espelho e a janela**\n` +
    `Olhamos pela janela para ver o mundo e no espelho para ver a nós mesmos. [INTERPRETAÇÃO] A Escritura ora é janela (revelação de Deus), ora é espelho (revelação de nós). ` +
    `[APLICAÇÃO] Ensinar o ouvinte a perguntar em cada passagem: o que isso me revela sobre Deus? O que isso me revela sobre mim?\n\n` +
    `*Lembrete: ilustração boa é curta, concreta e não rouba o centro do sermão.*`;
}

function aplicacoesPadrao(): string {
  return `**Aplicações práticas (3 níveis)**\n\n` +
    `**Pessoal**\n` +
    `• Reservar 10 min diários para reler o texto-base em outra tradução.\n` +
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

function cruzamentosPadrao(): string {
  return `**Referências cruzadas relevantes**\n\n` +
    `**Antigo Testamento**\n` +
    `• Salmos 119:105 — "Lâmpada para os meus pés é a tua palavra." (conexão: a Palavra como direção)\n` +
    `• Provérbios 3:5-6 — confiar de todo o coração. (conexão temática geral)\n` +
    `• Isaías 55:10-11 — a Palavra que não volta vazia. (conexão: poder da Palavra)\n\n` +
    `**Novo Testamento**\n` +
    `• Tiago 1:22-25 — ouvir e praticar. (conexão: aplicação prática)\n` +
    `• João 17:17 — santificação pela verdade. (conexão: efeito da Palavra no crente)\n` +
    `• Hebreus 4:12 — viva e eficaz. (conexão: poder penetrante)\n\n` +
    `**Sugestão para o pregador:** ler essas passagens em sequência e identificar o fio condutor. ` +
    `Não cite todas no sermão — escolha 2 ou 3 que reforçam o ponto principal.\n\n` +
    `*Sugestão do assistente — confirme as conexões com seu próprio estudo antes de pregar.*`;
}

function perguntasPadrao(): string {
  return `**Perguntas para abrir diálogo na congregação**\n\n` +
    `1. Quando você lê este texto, qual palavra ou frase mais te chama atenção? Por quê?\n` +
    `2. Existe algo nesta passagem que te incomoda ou desafia?\n` +
    `3. Como o texto se conecta com algo que você viveu nesta semana?\n` +
    `4. Se este texto fosse uma carta pessoal para você hoje, qual seria a frase de abertura?\n` +
    `5. Que mentira esse texto quebra? Que verdade ele estabelece?\n\n` +
    `**Pergunta central para a célula/grupo pequeno após o sermão:**\n` +
    `"O que impede este texto de produzir efeito real na minha vida esta semana?"`;
}

function contextoPadrao(m: Mensagem): string {
  const livro = m.livroBiblico || 'o livro';
  return `**Contexto histórico-cultural**\n\n` +
    `**Quando:** o livro de ${livro} foi escrito em um período marcado por [verificar datação no estudo pessoal]. ` +
    `**Para quem:** a audiência original enfrentava [verificar perfil da audiência original]. ` +
    `**Gênero literário:** [verificar — narrativa, poesia, epístola, profecia, apocalíptico]. ` +
    `**Costumes e cenário:** [verificar elementos geográficos, sociais e religiosos do período].\n\n` +
    `[INTERPRETAÇÃO] Compreender o cenário original evita anacronismo e protege a exegese de aplicações forçadas.\n\n` +
    `[APLICAÇÃO] Compartilhe 1 ou 2 elementos do cenário original que aproximam o ouvinte do mundo do texto — sem virar aula de história.\n\n` +
    `*Fontes sugeridas para estudo adicional: Dicionário Bíblico Vine, Comentário de Matthew Henry, Atlas Bíblico.*`;
}

function resumoPadrao(): string {
  return `**Resumo executivo**\n\n` +
    `• **Tema central:** a passagem revela [preencha após o estudo].\n` +
    `• **Tese:** [elabore uma frase-síntese de toda a mensagem].\n` +
    `• **Estrutura:** 3 pontos com progressão lógica (contexto → revelação → aplicação).\n` +
    `• **Tempo ideal:** distribuir proporcionalmente — 25% contexto, 50% revelação, 25% aplicação.\n` +
    `• **Versículo-âncora:** o versículo mais forte da passagem, repetido na conclusão.\n` +
    `• **Aplicação final:** uma única ação concreta, mensurável, executável em 7 dias.\n\n` +
    `*Sugestão do assistente — refine com seu próprio estudo.*`;
}

export class LocalProvider implements AIProvider {
  info(): ProviderInfo {
    return {
      id: 'local',
      nome: 'Assistente Local',
      descricao: 'Respostas estruturadas sem IA generativa. Funciona offline, sem custo.',
      modelos: [
        {
          id: 'templates',
          nome: 'Templates estruturados',
          contexto: 16_000,
          custoInput: 0,
          custoOutput: 0,
          descricao: 'Respostas instantâneas a partir do contexto. Ideal pra rascunhos rápidos.',
        },
      ],
      requerChave: false,
      offline: true,
    };
  }

  async pronto(): Promise<{ ok: boolean; motivo?: string }> {
    return { ok: true };
  }

  async enviar(req: AIRequest): Promise<AIResponse> {
    const inicioMs = Date.now();

    // Delay simulado pra UX parecer real
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    // Pega a última mensagem do usuário
    const ultimaUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const textoUser = ultimaUser?.content ?? '';

    // Tenta casar com uma das ações conhecidas
    const acao = ACOES.find((a) =>
      textoUser.toLowerCase().includes(a.rotulo.toLowerCase()) ||
      textoUser.toLowerCase().includes(a.id),
    );

    let conteudo = '';
    if (acao && req.mensagemContexto) {
      conteudo = acao.padrao('', req.mensagemContexto);
    } else if (req.mensagemContexto) {
      // resposta genérica mas útil
      const m = req.mensagemContexto;
      const refs = m.versiculos.map((v) => `${v.livro} ${v.capitulo}:${v.versiculos}`).join(', ');
      conteudo =
        `**Assistente Ministerial — resposta local**\n\n` +
        `Entendi seu pedido. Você está trabalhando em **"${m.titulo || 'Sem título'}"**` +
        (m.textoBase ? ` (${m.textoBase})` : '') + '.\n\n' +
        `Para te ajudar melhor, escolha uma das ações no menu lateral:\n\n` +
        ACOES.map((a) => `- **${a.rotulo}**`).join('\n') +
        `\n\nQuando você configurar uma chave da API OpenAI nas Configurações, eu passo a gerar respostas personalizadas com IA real, mantendo este mesmo contexto.\n\n` +
        (refs ? `**Referências carregadas:** ${refs}\n` : '');
    } else {
      conteudo =
        `**Assistente Ministerial**\n\n` +
        `Para te ajudar com profundidade, abra uma mensagem no editor. Eu pego automaticamente o tema, texto-base, versículos e esboço.\n\n` +
        `Enquanto isso, posso conversar sobre teologia, exegese, pregação e vida ministerial de forma geral. O que você gostaria de discutir?`;
    }

    if (req.systemAppend) conteudo += `\n\n---\n${req.systemAppend}`;

    const tokensInput = this.estimarTokens(req.messages.map((m) => m.content).join('\n') + (req.mensagemContexto ? contextoMensagem(req.mensagemContexto) : ''));
    const tokensOutput = this.estimarTokens(conteudo);

    return {
      content: conteudo,
      tokensTotal: tokensInput + tokensOutput,
      tokensInput,
      tokensOutput,
      model: 'templates',
      provider: 'local',
      custoUSD: 0,
      fimEm: Date.now(),
      duracaoMs: Date.now() - inicioMs,
    };
  }

  estimarTokens(texto: string): number {
    if (!texto) return 0;
    return Math.ceil(texto.length / 3.5);
  }
}

export const localProvider = new LocalProvider();

export { ACOES };