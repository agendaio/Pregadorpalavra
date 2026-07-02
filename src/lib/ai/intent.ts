/**
 * Intent Detection — Classifica a intenção da mensagem do usuário.
 *
 * two-tier approach:
 * 1. Fast keyword matching (sincrono, zero latência)
 * 2. Só cai pro fallback quando é genuinamente ambíguo
 *
 * Categorias:
 * - chat:    pergunta rápida, explicação, pesquisa bíblica
 * - sermon:  criar/montar/preparar sermão, esboço ou estudo
 *
 * Rules:
 * - "Criar sermão"     → sermon
 * - "Monte um esboço"  → sermon
 * - "Prepare uma pregação" → sermon
 * - "Criar série"      → sermon
 * - "Quem foi Sansão?" → chat
 * - "Explique João 3:16" → chat
 * - "O que é graça?"   → chat
 */

export type ChatModo = 'chat' | 'sermon';

// Padrões que ACTIVAM o modo sermon
const SERMON_TRIGGERS = [
  // Português
  /^(crie|monte|prepare|desenvolva|faça|gere|criar|montar|preparar|desenvolver|fazer|gerar)\b.*(sermão|sermao|esboço|esboco|pregação|pregacao|mensagem|estudo|study|sermon)/i,
  /^(crie|monte|prepare|desenvolva|faça|gere)\b/i,
  /\b(criar|montar|preparar|desenvolver|fazer|gerar)\b.*\b(sermão|sermao|esboço|esboco|pregação|pregacao|mensagem|estudo|discurso|palestra)/i,
  /\b(serie|série|sequência|sequencia)\b.*\b(mensagem|pregação|esboço)/i,
  /\b(estudo\b.*\bcélula|célula\b.*\bestudo|célula\b)/i,
  /\b(planning|planeje|planejar|planeamento)\b/i,
  /\b(material\b.*\bpregação|pregação\b.*\bmaterial)\b/i,

  // English (fallback)
  /\b(create|make|build|prepare|generate)\b.*\b(sermon|outline|message|study|preaching)\b/i,
  /\bdevelop\b.*\bsermon/i,
];

// Padrões que SÃO perguntas rápidas (chat) — mesmo que contenham keywords ambíguas
const CHAT_TRIGGERS = [
  // Quem/o que/onde/por que/como
  /^(quem|o que|oq|onde|por que|porquê|como|qual|quando)\b/i,
  /\b(o que|oq|quem|onde|por que|porque|como|qual|quando)\s/i,
  // Explicar/definir/traduzir/interpretar
  /^(explique|defina|traduza|interprete|resuma|resuma-me|diga-me|me explique)/i,
  /\b(explique|defina|traduza|interprete|resuma|diga-me|me explique)\b/i,
  // Versículos específicos
  /\b(joão|mateus|marcos|lucas|atos|romanos|hebreu|apocalipse|sl|jó|joel|amós|gn|ex|lv|nm|dt|js|2sam|1rs|2rs|1cr|2cr|ne|et|sl|pr|ec|ct|is|jr|lm|ez|dn|os|jl|am|ob|jon|mq|na|hc|hg|zc|ml|mt|mc|lc|jo|at|rm|1co|2co|gl|ef|fp|cl|1ts|2ts|1ti|2ti|tit|fm|hb|tg|1pe|2pe|1jo|2jo|3jo|jd|ap)\s+\d+[\s:,]\d+/i,
  /\b(versículo|versiculo|capítulo|capitulo)\b/i,
  // Pesquisar/comparar/contrastar
  /\b(pesquise|busque|encontre|compare|contraste)\b/i,
  // Perguntas diretas com ponto de interrogação
  /^[^a-zA-ZáàâãéèêíïóôõúüÁÀÂÃÉÈÊÍÏÓÔÕÚÜ]*.+\?$/,
  // English
  /\b(who is|who was|what is|what was|where is|where was|why is|how to|how does|explain|define|translate)\b/i,
];

export interface IntentResult {
  modo: ChatModo;
  motivo: string;
}

/**
 * Detecta a intenção da mensagem de forma rápida (síncrona).
 * Não faz chamada de API — usa apenas regex.
 */
export function detectarIntencao(mensagem: string): IntentResult {
  const texto = mensagem.trim();

  if (!texto) return { modo: 'chat', motivo: 'vazio' };

  // 1. Verifica se é claramente uma pergunta rápida
  for (const regex of CHAT_TRIGGERS) {
    if (regex.test(texto)) {
      return { modo: 'chat', motivo: 'pergunta_rápida' };
    }
  }

  // 2. Verifica se é claramente um pedido de criação de sermão/esboço
  for (const regex of SERMON_TRIGGERS) {
    if (regex.test(texto)) {
      return { modo: 'sermon', motivo: 'pedido_sermao' };
    }
  }

  // 3. Heurística de tamanho: mensagens curtas (< 15 palavras) → chat
  const palavras = texto.split(/\s+/);
  if (palavras.length < 15) {
    return { modo: 'chat', motivo: 'mensagem_curta' };
  }

  // 4. Ambíguo mas potencialmente sermon: default para chat
  // (o usuário pode refinar no chat se precisar)
  return { modo: 'chat', motivo: 'default' };
}
