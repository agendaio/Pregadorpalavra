/**
 * Exporters — converte uma Mensagem em Markdown, PDF ou DOCX.
 *
 * Funciona 100% client-side. Sem dependência de servidor ou login.
 *
 * Uso:
 *   import { exportarMensagem } from '@/lib/exporters';
 *   await exportarMensagem(mensagem, 'pdf');
 */

import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from './fileSaver';
import type { Mensagem } from '@/types/mensagem';

// ─── Parser do esboço ───────────────────────────────────────────────────────
// O esboço é texto Tiptap HTML. Simplificamos pra extrair estrutura.

interface CapituloEsboco {
  titulo: string;
  paragrafos: string[];
}

function parsearEsbocoParaCapitulos(esboco: string): CapituloEsboco[] {
  if (!esboco) return [];
  // Quebra por h2/h3/h1 ou linhas iniciadas com ## ou ** (markdown style)
  const html = esboco
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n## $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?(p|div|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  const linhas = html.split('\n').map(l => l.trim()).filter(Boolean);
  const capitulos: CapituloEsboco[] = [];
  let atual: CapituloEsboco = { titulo: 'Introdução', paragrafos: [] };

  for (const linha of linhas) {
    if (linha.startsWith('## ')) {
      if (atual.paragrafos.length > 0 || atual.titulo !== 'Introdução') {
        capitulos.push(atual);
      }
      atual = { titulo: linha.replace(/^##\s+/, '').replace(/\*\*/g, '').trim(), paragrafos: [] };
    } else if (linha.startsWith('### ')) {
      atual.paragrafos.push(`__${linha.replace(/^###\s+/, '').replace(/\*\*/g, '').trim()}__`);
    } else {
      atual.paragrafos.push(linha);
    }
  }
  if (atual.paragrafos.length > 0 || atual.titulo !== 'Introdução') {
    capitulos.push(atual);
  }
  return capitulos;
}

function formatarData(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function sanitizarNomeArquivo(titulo: string): string {
  return (titulo || 'pregao')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'pregao';
}

// ─── Markdown ──────────────────────────────────────────────────────────────

function gerarMarkdown(m: Mensagem): string {
  const linhas: string[] = [];
  linhas.push(`# ${m.titulo || 'Pregação'}`);
  linhas.push('');

  if (m.textoBase || m.livroBiblico) {
    linhas.push(`> **Texto Base:** ${m.textoBase}${m.livroBiblico ? ` (${m.livroBiblico})` : ''}`);
    linhas.push('');
  }

  const meta: string[] = [];
  if (m.tema) meta.push(`**Tema:** ${m.tema}`);
  if (m.objetivo) meta.push(`**Objetivo:** ${m.objetivo}`);
  if (m.publico) meta.push(`**Público:** ${m.publico}`);
  if (meta.length > 0) {
    linhas.push(meta.join('  \n'));
    linhas.push('');
  }

  if (m.versiculos.length > 0) {
    linhas.push('## Versículos-chave');
    linhas.push('');
    for (const v of m.versiculos) {
      const ref = `${v.livro} ${v.capitulo}:${v.versiculos}`;
      linhas.push(`- **${ref}:** ${v.texto || ''}`);
    }
    linhas.push('');
  }

  const capitulos = parsearEsbocoParaCapitulos(m.esboco);
  if (capitulos.length > 0) {
    linhas.push('## Esboço');
    linhas.push('');
    for (const cap of capitulos) {
      linhas.push(`### ${cap.titulo}`);
      linhas.push('');
      for (const p of cap.paragrafos) {
        linhas.push(p);
        linhas.push('');
      }
    }
  } else if (m.conteudo) {
    linhas.push('## Conteúdo');
    linhas.push('');
    linhas.push(m.conteudo.replace(/<[^>]+>/g, '').trim());
  }

  if (m.aplicacoes.length > 0) {
    linhas.push('## Aplicações Práticas');
    linhas.push('');
    for (const a of m.aplicacoes) {
      linhas.push(`- ${a}`);
    }
    linhas.push('');
  }

  linhas.push('---');
  linhas.push(`*Pregador OS · ${formatarData(m.criadoEm || Date.now())}*`);
  return linhas.join('\n');
}

// ─── DOCX ──────────────────────────────────────────────────────────────────

async function gerarDOCX(m: Mensagem): Promise<Blob> {
  const children: Paragraph[] = [];

  // Capa
  children.push(new Paragraph({
    children: [new TextRun({ text: m.titulo || 'Pregação', bold: true, size: 48 })],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 400 },
  }));

  if (m.textoBase) {
    children.push(new Paragraph({
      children: [new TextRun({ text: m.textoBase, italics: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: `Pregador OS · ${formatarData(m.criadoEm || Date.now())}`, size: 20, color: '888888' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }));

  // Metadata
  const meta: string[] = [];
  if (m.tema) meta.push(`Tema: ${m.tema}`);
  if (m.objetivo) meta.push(`Objetivo: ${m.objetivo}`);
  if (m.publico) meta.push(`Público: ${m.publico}`);
  if (meta.length > 0) {
    for (const l of meta) {
      children.push(new Paragraph({ children: [new TextRun({ text: l, size: 22 })] }));
    }
    children.push(new Paragraph({ text: '' }));
  }

  // Versículos
  if (m.versiculos.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Versículos-chave', bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
    }));
    for (const v of m.versiculos) {
      const ref = `${v.livro} ${v.capitulo}:${v.versiculos}`;
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${ref}: `, bold: true }),
          new TextRun({ text: v.texto || '' }),
        ],
        bullet: { level: 0 },
      }));
    }
    children.push(new Paragraph({ text: '' }));
  }

  // Esboço
  const capitulos = parsearEsbocoParaCapitulos(m.esboco);
  if (capitulos.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Esboço', bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
    }));
    for (const cap of capitulos) {
      children.push(new Paragraph({
        children: [new TextRun({ text: cap.titulo, bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
      }));
      for (const p of cap.paragrafos) {
        const isBold = p.startsWith('__') && p.endsWith('__');
        const text = isBold ? p.slice(2, -2) : p;
        children.push(new Paragraph({
          children: [new TextRun({ text, bold: isBold, size: 22 })],
          spacing: { after: 120 },
        }));
      }
    }
  } else if (m.conteudo) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Conteúdo', bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
    }));
    for (const paragrafo of m.conteudo.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: paragrafo, size: 22 })], spacing: { after: 120 } }));
    }
  }

  // Aplicações
  if (m.aplicacoes.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Aplicações Práticas', bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
    }));
    for (const a of m.aplicacoes) {
      children.push(new Paragraph({ children: [new TextRun({ text: a, size: 22 })], bullet: { level: 0 } }));
    }
  }

  const doc = new Document({
    creator: 'Pregador OS',
    title: m.titulo || 'Pregação',
    description: m.tema || m.textoBase || '',
    sections: [{ children }],
  });

  return await Packer.toBlob(doc);
}

// ─── PDF ───────────────────────────────────────────────────────────────────

function gerarPDF(m: Mensagem): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - margin * 2;
  let y = margin;

  const corPrimaria: [number, number, number] = [180, 130, 30];
  const corTexto: [number, number, number] = [40, 40, 40];
  const corSuave: [number, number, number] = [120, 120, 120];

  // Helper: nova página se necessário
  const checkPagina = (altura: number) => {
    if (y + altura > pageH - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header / rodapé
  const addHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(...corSuave);
    doc.text(`Pregador OS · ${m.titulo || 'Pregação'}`, margin, 12);
    doc.text(formatarData(m.criadoEm || Date.now()), pageW - margin, 12, { align: 'right' });
    doc.setDrawColor(...corPrimaria);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, pageW - margin, 14);
  };

  // Capa
  doc.setFillColor(15, 15, 25);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  const tituloQuebrado = doc.splitTextToSize(m.titulo || 'Pregação', maxW - 20);
  doc.text(tituloQuebrado, pageW / 2, pageH / 2 - 20, { align: 'center' });

  if (m.textoBase) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(220, 200, 150);
    doc.text(m.textoBase, pageW / 2, pageH / 2 + 10, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text('Pregador OS · Sistema Operacional para Pregadores', pageW / 2, pageH - 20, { align: 'center' });

  // Página 2: conteúdo
  doc.addPage();
  y = margin;
  addHeader();

  // Texto-base em destaque
  if (m.textoBase) {
    doc.setFillColor(252, 245, 220);
    doc.rect(margin, y, maxW, 14, 'F');
    doc.setDrawColor(...corPrimaria);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...corTexto);
    doc.text(`Texto-Base: ${m.textoBase}`, margin + 3, y + 6);
    if (m.tema) doc.text(`Tema: ${m.tema}`, margin + 3, y + 11);
    y += 18;
  }

  // Metadata
  const meta: string[] = [];
  if (m.objetivo) meta.push(`Objetivo: ${m.objetivo}`);
  if (m.publico) meta.push(`Público: ${m.publico}`);
  if (meta.length > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...corSuave);
    for (const l of meta) {
      const lns = doc.splitTextToSize(l, maxW);
      for (const ln of lns) {
        checkPagina(4);
        doc.text(ln, margin, y);
        y += 4;
      }
    }
    y += 4;
  }

  // Versículos
  if (m.versiculos.length > 0) {
    checkPagina(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...corPrimaria);
    doc.text('Versículos-chave', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...corTexto);
    for (const v of m.versiculos) {
      const ref = `${v.livro} ${v.capitulo}:${v.versiculos}`;
      const texto = `${ref}: ${v.texto || ''}`;
      const lns = doc.splitTextToSize(texto, maxW - 4);
      for (const ln of lns) {
        checkPagina(5);
        doc.text(ln, margin, y);
        y += 4.5;
      }
      y += 1.5;
    }
    y += 4;
  }

  // Esboço
  const capitulos = parsearEsbocoParaCapitulos(m.esboco);
  if (capitulos.length > 0) {
    checkPagina(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...corPrimaria);
    doc.text('Esboço', margin, y);
    y += 7;

    for (const cap of capitulos) {
      checkPagina(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...corPrimaria);
      const tituloLns = doc.splitTextToSize(cap.titulo, maxW);
      for (const ln of tituloLns) {
        checkPagina(6);
        doc.text(ln, margin, y);
        y += 5.5;
      }
      y += 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...corTexto);
      for (const p of cap.paragrafos) {
        const isBold = p.startsWith('__') && p.endsWith('__');
        const text = isBold ? p.slice(2, -2) : p;
        if (isBold) doc.setFont('helvetica', 'bold');
        const lns = doc.splitTextToSize(text, maxW);
        for (const ln of lns) {
          checkPagina(5);
          doc.text(ln, margin + 2, y);
          y += 4.5;
        }
        doc.setFont('helvetica', 'normal');
        y += 2;
      }
      y += 4;
    }
  } else if (m.conteudo) {
    checkPagina(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...corPrimaria);
    doc.text('Conteúdo', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...corTexto);
    const paragrafos = m.conteudo.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
    for (const paragrafo of paragrafos) {
      const lns = doc.splitTextToSize(paragrafo, maxW);
      for (const ln of lns) {
        checkPagina(5);
        doc.text(ln, margin, y);
        y += 4.5;
      }
      y += 2;
    }
  }

  // Aplicações
  if (m.aplicacoes.length > 0) {
    checkPagina(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...corPrimaria);
    doc.text('Aplicações Práticas', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...corTexto);
    for (const a of m.aplicacoes) {
      const lns = doc.splitTextToSize(`• ${a}`, maxW - 4);
      for (const ln of lns) {
        checkPagina(5);
        doc.text(ln, margin + 2, y);
        y += 4.5;
      }
      y += 1.5;
    }
  }

  // Footer em todas as páginas
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...corSuave);
    doc.text(`Página ${i} de ${totalPaginas}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  return doc.output('blob');
}

// ─── API pública ───────────────────────────────────────────────────────────

export type FormatoExport = 'md' | 'pdf' | 'docx';

export async function exportarMensagem(m: Mensagem, formato: FormatoExport): Promise<void> {
  const nome = sanitizarNomeArquivo(m.titulo);

  if (formato === 'md') {
    const md = gerarMarkdown(m);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${nome}.md`);
  } else if (formato === 'docx') {
    const blob = await gerarDOCX(m);
    saveAs(blob, `${nome}.docx`);
  } else if (formato === 'pdf') {
    const blob = gerarPDF(m);
    saveAs(blob, `${nome}.pdf`);
  }
}
