/**
 * Parser do esboço Tiptap → capítulos estruturados pro Modo Púlpito.
 *
 * Tiptap gera HTML com tags <h1>, <h2>, <h3>, <p>, <ul>, <ol>, etc.
 * Agrupamos o conteúdo sob cada Heading1 como um "capítulo".
 * Heading2 dentro de um capítulo vira "subtítulo".
 * Qualquer outro nó vira uma "linha de conteúdo".
 */

import type { Capitulo, Bloco } from '@/stores/progressoPulpit';

function nodeText(node: ChildNode): string {
  return (node.textContent ?? '').trim();
}

function isHeading(node: ChildNode, level: number): boolean {
  return node.nodeName === `H${level}`;
}

function isBlockElement(node: ChildNode): boolean {
  const t = node.nodeName;
  return ['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'DIV'].includes(t);
}

function nodeToLine(node: ChildNode): string {
  // Expande listas para formato texto linear
  if (node.nodeName === 'UL' || node.nodeName === 'OL') {
    const items = Array.from(node.childNodes)
      .filter((n) => n.nodeName === 'LI')
      .map((li) => `• ${nodeText(li)}`)
      .join('\n');
    return items;
  }
  return nodeText(node);
}

/**
 * Parseia o HTML do esboço e retorna uma lista de capítulos.
 * Se o esboço não tem headings, retorna um capítulo único com todo o conteúdo.
 */
export function parsearEsboco(html: string): Capitulo[] {
  if (!html || html.trim() === '') {
    return [{
      id: 0,
      titulo: 'Conteúdo',
      blocos: [{ id: 0, texto: 'Sem conteúdo. Adicione o sermão no editor antes de abrir o Modo Púlpito.' }],
    }];
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const capitulos: Capitulo[] = [];
  let capituloCorrente: Capitulo | null = null;
  let blockId = 0;

  tmp.childNodes.forEach((node) => {
    const texto = nodeText(node);
    if (!texto) return;

    if (isHeading(node, 1)) {
      // Novo capítulo principal
      capituloCorrente = {
        id: capitulos.length,
        titulo: texto,
        blocos: [],
      };
      capitulos.push(capituloCorrente);
      blockId = 0;
    } else if (isHeading(node, 2) && capituloCorrente) {
      // Subtítulo dentro do capítulo — vira um bloco de destaque
      capituloCorrente.blocos.push({
        id: blockId++,
        texto: `▌ ${texto}`,
      });
    } else if (isHeading(node, 3) && capituloCorrente) {
      // Sub-subtítulo — linha com indent
      capituloCorrente.blocos.push({
        id: blockId++,
        texto: `  ◦ ${texto}`,
      });
    } else if (isBlockElement(node) && texto) {
      if (!capituloCorrente) {
        // Nenhum heading ainda → cria capítulo "Conteúdo"
        capituloCorrente = {
          id: 0,
          titulo: 'Conteúdo',
          blocos: [],
        };
        capitulos.push(capituloCorrente);
      }
      // Gera uma ou mais linhas (listas viram múltiplas linhas)
      const linhas = nodeToLine(node).split('\n').filter((l) => l.trim());
      linhas.forEach((linha) => {
        capituloCorrente!.blocos.push({ id: blockId++, texto: linha });
      });
    } else if (texto) {
      // Texto avulso (inline) — adiciona como linha
      if (!capituloCorrente) {
        capituloCorrente = { id: 0, titulo: 'Conteúdo', blocos: [] };
        capitulos.push(capituloCorrente);
      }
      // Pula se for só whitespace
      if (texto.trim()) {
        capituloCorrente.blocos.push({ id: blockId++, texto: texto.trim() });
      }
    }
  });

  // Fallback: se tudo falhou
  if (capitulos.length === 0) {
    const texto = tmp.textContent?.trim() || 'Sem conteúdo.';
    return [{
      id: 0,
      titulo: 'Conteúdo',
      blocos: [{ id: 0, texto }],
    }];
  }

  return capitulos;
}
