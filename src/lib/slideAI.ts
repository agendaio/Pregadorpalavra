/**
 * IA por slide — pede pro assistente preencher os campos de UM slide
 * específico (capa, verso, conteúdo…), em vez de gerar o esboço inteiro.
 *
 * Estratégia: instruímos o modelo a responder só com JSON no formato exato
 * do tipo de slide, e aplicamos direto nos campos do form.
 */

import { enviarComFallback } from '@/lib/ai/router';
import type { Mensagem, SlideContent, SlideType } from '@/types/mensagem';

const SCHEMAS: Record<SlideType, string> = {
  capa: `{"titulo": "string — título de impacto da mensagem", "referencia": "string — referência bíblica (Livro Cap:Ver)", "subtitulo": "string — subtítulo curto, opcional"}`,
  verso: `{"citacao": "string — o texto do versículo, fiel à tradução", "referencia": "string — referência bíblica (Livro Cap:Ver)"}`,
  conteudo: `{"titulo": "string — título do slide", "pontos": [{"numero": 1, "titulo": "string curto", "descricao": "string — 1 frase"}]} — gere entre 2 e 4 pontos`,
  categorias: `{"titulo": "string — título do slide", "cards": [{"titulo": "string curto", "descricao": "string — 1 frase", "referencia": "string — referência bíblica, opcional"}]} — gere entre 2 e 4 cards`,
  chamada: `{"titulo": "string — título de impacto", "texto": "string — texto da chamada para ação, 2-3 frases", "cta": "string — texto curto de botão, ex: Vamos orar"}`,
  oracao: `{"titulo": "string — título curto, opcional", "texto": "string — oração de encerramento, 3-5 frases"}`,
};

const NOME_TIPO: Record<SlideType, string> = {
  capa: 'Capa',
  verso: 'Verso bíblico',
  conteudo: 'Conteúdo',
  categorias: 'Categorias',
  chamada: 'Chamada para ação',
  oracao: 'Oração final',
};

function extrairJSON(texto: string): unknown {
  // Remove blocos ```json ... ``` se o modelo ignorar a instrução de "só JSON"
  const semFences = texto.replace(/```json|```/gi, '').trim();
  const inicio = semFences.indexOf('{');
  const fim = semFences.lastIndexOf('}');
  if (inicio === -1 || fim === -1) throw new Error('Resposta sem JSON');
  return JSON.parse(semFences.slice(inicio, fim + 1));
}

/**
 * Pede à IA um conteúdo pronto para o slide, já no formato dos campos.
 * `instrucao` é o pedido opcional do usuário (ex: "fale sobre perseverança").
 */
export async function gerarConteudoSlideComIA(
  tipo: SlideType,
  mensagem: Mensagem,
  instrucao: string,
): Promise<SlideContent> {
  const contexto = [
    mensagem.titulo && `Título da mensagem: ${mensagem.titulo}`,
    mensagem.tema && `Tema: ${mensagem.tema}`,
    mensagem.textoBase && `Texto-base: ${mensagem.textoBase}`,
    mensagem.objetivo && `Objetivo: ${mensagem.objetivo}`,
  ].filter(Boolean).join('\n');

  const systemAppend = `Você ajuda pastores e pregadores a preparar slides de púlpito. Você está preenchendo um slide do tipo "${NOME_TIPO[tipo]}".

Contexto da mensagem:
${contexto || '(sem contexto adicional — use bom senso pastoral e bíblico)'}

Responda ESTRITAMENTE com um único objeto JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
${SCHEMAS[tipo]}

Regras: nunca invente versículos ou referências. Seja fiel às Escrituras, claro, pastoral e direto.`;

  const { response } = await enviarComFallback({
    messages: [{ role: 'user', content: instrucao || `Preencha este slide de "${NOME_TIPO[tipo]}" com um conteúdo adequado para a mensagem.` }],
    systemAppend,
    maxTokens: 700,
    temperature: 0.7,
  });

  const parsed = extrairJSON(response.content) as Record<string, unknown>;

  if (tipo === 'conteudo' && Array.isArray(parsed.pontos)) {
    parsed.pontos = (parsed.pontos as Array<Record<string, unknown>>).map((p, i) => ({
      numero: i + 1,
      titulo: String(p.titulo ?? ''),
      descricao: String(p.descricao ?? ''),
    }));
  }
  if (tipo === 'categorias' && Array.isArray(parsed.cards)) {
    parsed.cards = (parsed.cards as Array<Record<string, unknown>>).map((c) => ({
      titulo: String(c.titulo ?? ''),
      descricao: String(c.descricao ?? ''),
      referencia: c.referencia ? String(c.referencia) : undefined,
    }));
  }

  return { tipo, ...parsed } as SlideContent;
}

export function slideTipoLabel(tipo: SlideType): string {
  return NOME_TIPO[tipo] ?? 'Slide';
}
