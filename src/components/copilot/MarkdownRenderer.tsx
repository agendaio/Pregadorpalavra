/**
 * MarkdownRenderer — Render profissional de markdown com ações inline.
 *
 * Recursos:
 * - Hierarquia visual: H1, H2 (com borda + ações), H3, listas, código, blockquote
 * - Cada bloco H2 vira uma "seção fechada" com hover mostrando botões inline:
 *   [Copiar] [Compartilhar] [Adicionar ao esboço]
 * - Versículos bíblicos viram badges clicáveis (referência em destaque)
 * - Marcação [FATO] / [INTERPRETAÇÃO] / [APLICAÇÃO] com cores distintas
 * - Espaçamento generoso, parágrafos curtos, leitura confortável
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, CheckCheck, BookOpen, Share2, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos de ações inline ─────────────────────────────────────────────────

export type SectionAction = 'copy' | 'share' | 'add_to_outline';

export interface SectionData {
  id: string;
  title: string;
  content: string;
  type: 'h1' | 'h2' | 'h3';
}

interface MarkdownRendererProps {
  content: string;
  onCopySection?: (text: string) => void;
  onShareSection?: (text: string) => void;
  onAddSectionToOutline?: (text: string, title: string) => void;
}

// ─── Parser: divide o conteúdo em seções (H1/H2) com ações inline ─────────

function parseIntoSections(content: string): {
  intro: string;
  sections: SectionData[];
} {
  const lines = content.split('\n');
  const intro: string[] = [];
  const sections: SectionData[] = [];
  let current: { id: string; title: string; type: 'h1' | 'h2' | 'h3'; lines: string[] } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h2 || h1 || h3) {
      if (current) {
        sections.push({
          id: current.id,
          title: current.title,
          type: current.type,
          content: current.lines.join('\n').trim(),
        });
      }
      const type = h1 ? 'h1' : h3 ? 'h3' : 'h2';
      const title = (h1?.[1] ?? h2?.[1] ?? h3?.[1] ?? '').trim();
      current = {
        id: `sec-${sections.length}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        type,
        lines: [],
      };
    } else {
      if (current) current.lines.push(line);
      else intro.push(line);
    }
  }

  if (current) {
    sections.push({
      id: current.id,
      title: current.title,
      type: current.type,
      content: current.lines.join('\n').trim(),
    });
  }

  return { intro: intro.join('\n').trim(), sections };
}

// ─── Componente principal ─────────────────────────────────────────────────

export function MarkdownRenderer({
  content,
  onCopySection,
  onShareSection,
  onAddSectionToOutline,
}: MarkdownRendererProps) {
  const { intro, sections } = parseIntoSections(content);
  const hasSections = sections.length > 0;

  return (
    <div className="space-y-4">
      {intro && (
        <div className="prose-chat">
          <MarkdownBody content={intro} />
        </div>
      )}

      {hasSections ? (
        <div className="space-y-4">
          {sections.map(section => (
            <SectionBlock
              key={section.id}
              section={section}
              onCopy={onCopySection}
              onShare={onShareSection}
              onAddToOutline={onAddSectionToOutline}
            />
          ))}
        </div>
      ) : (
        !intro && <MarkdownBody content={content} />
      )}
    </div>
  );
}

// ─── Bloco de seção (H1/H2) com ações inline no hover ─────────────────────

function SectionBlock({
  section,
  onCopy,
  onShare,
  onAddToOutline,
}: {
  section: SectionData;
  onCopy?: (text: string) => void;
  onShare?: (text: string) => void;
  onAddToOutline?: (text: string, title: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  const sectionText = `## ${section.title}\n\n${section.content}`;

  const handleCopy = useCallback(() => {
    onCopy?.(sectionText);
    navigator.clipboard.writeText(sectionText).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [onCopy, sectionText]);

  const handleShare = useCallback(() => {
    onShare?.(sectionText);
    if (navigator.share) {
      navigator.share({ text: sectionText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(sectionText).catch(() => {});
    }
  }, [onShare, sectionText]);

  const handleAdd = useCallback(() => {
    onAddToOutline?.(section.content, section.title);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }, [onAddToOutline, section.content, section.title]);

  const HeaderTag = section.type === 'h1' ? 'h1' : section.type === 'h3' ? 'h3' : 'h2';
  const titleSize =
    section.type === 'h1'
      ? 'text-[18px] font-bold'
      : section.type === 'h3'
        ? 'text-[14px] font-semibold'
        : 'text-[15.5px] font-semibold';

  // "Leituras Complementares" ganha destaque próprio — cor diferente das
  // demais seções, pra ficar visualmente isolada e fácil de achar.
  const isLeituras = /leituras?\s+complementares?/i.test(section.title);

  return (
    <section
      className={cn(
        'group/section rounded-xl border transition-colors',
        isLeituras
          ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-900/10 dark:hover:border-amber-700'
          : 'border-ink-200/80 bg-white/40 hover:border-ink-300 hover:bg-white/70 dark:border-ink-700 dark:bg-ink-900/30 dark:hover:border-ink-600 dark:hover:bg-ink-900/50',
      )}
    >
      {/* Header da seção com ações inline */}
      <header className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-1.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-transform',
              isLeituras ? 'text-amber-500' : 'text-ink-400',
              !open && '-rotate-90',
            )}
          />
          {isLeituras && <BookOpen className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />}
          <HeaderTag
            className={cn(
              'm-0 flex-1 tracking-tight',
              isLeituras ? 'text-amber-800 dark:text-amber-300' : 'text-ink-900 dark:text-white',
              section.type === 'h2' && cn('border-b pb-1.5', isLeituras ? 'border-amber-200/60 dark:border-amber-800/40' : 'border-ink-200/60 dark:border-ink-700'),
              titleSize,
            )}
          >
            {section.title}
          </HeaderTag>
        </button>

        {/* Ações inline — aparecem no hover da seção */}
        <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/section:opacity-100 focus-within:opacity-100">
          <InlineAction
            icon={copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            label={copied ? 'Copiado!' : 'Copiar'}
            onClick={handleCopy}
          />
          <InlineAction
            icon={<Share2 className="h-3.5 w-3.5" />}
            label="Compartilhar"
            onClick={handleShare}
          />
          <InlineAction
            icon={added ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Plus className="h-3.5 w-3.5" />}
            label={added ? 'Adicionado!' : 'Adicionar ao esboço'}
            onClick={handleAdd}
            highlight
          />
        </div>
      </header>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="prose-chat px-3.5 pb-3.5 pt-1">
              <MarkdownBody content={section.content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Botão de ação inline ──────────────────────────────────────────────────

function InlineAction({
  icon,
  label,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium transition-colors',
        highlight
          ? 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/30'
          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100',
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

// ─── Renderizador de markdown ──────────────────────────────────────────────

function MarkdownBody({ content }: { content: string }) {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }) => (
          <h1 className="mb-2 mt-1 text-[17px] font-bold tracking-tight text-ink-900 dark:text-white" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="m-0 text-[15px] font-semibold text-ink-900 dark:text-white" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="mb-1.5 mt-3 text-[13.5px] font-semibold text-indigo-700 dark:text-indigo-300" {...props}>
            {children}
          </h3>
        ),
        p: ({ children, ...props }) => (
          <p className="mb-2.5 text-[13.5px] leading-relaxed text-ink-700 last:mb-0 dark:text-ink-200" {...props}>
            {children}
          </p>
        ),
        ul: ({ children, ...props }) => (
          <ul className="my-2 ml-1 space-y-1.5 text-[13px] text-ink-700 dark:text-ink-200" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="my-2 ml-1 space-y-1.5 text-[13px] text-ink-700 dark:text-ink-200" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => (
          <li className="ml-3 list-disc pl-1 leading-relaxed marker:text-ink-400" {...props}>
            {children}
          </li>
        ),
        strong: ({ children, ...props }) => {
          // Marcadores [FATO] / [INTERPRETAÇÃO] / [APLICAÇÃO] viram badges
          // coloridos em vez de negrito simples — fica fácil diferenciar
          // fato de interpretação de aplicação prática num relance.
          const texto = Array.isArray(children) ? children.join('') : String(children ?? '');
          const marcador = texto.trim().match(/^\[(FATO|INTERPRETAÇÃO|APLICAÇÃO)\]$/i);
          if (marcador) {
            const tipo = marcador[1].toUpperCase();
            const estilos: Record<string, string> = {
              FATO: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
              'INTERPRETAÇÃO': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
              'APLICAÇÃO': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            };
            return (
              <span className={cn('mr-1 inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide', estilos[tipo])}>
                {tipo}
              </span>
            );
          }
          return (
            <strong className="font-semibold text-ink-900 dark:text-white" {...props}>
              {children}
            </strong>
          );
        },
        em: ({ children, ...props }) => (
          <em className="italic text-ink-600 dark:text-ink-300" {...props}>
            {children}
          </em>
        ),
        code: ({ children, ...props }) => (
          <code
            className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px] text-ink-800 dark:bg-ink-800 dark:text-ink-200"
            {...props}
          >
            {children}
          </code>
        ),
        pre: ({ children, ...props }) => (
          <pre
            className="my-2 overflow-x-auto rounded-lg bg-ink-100 p-3 text-[12.5px] text-ink-800 dark:bg-ink-800 dark:text-ink-200"
            {...props}
          >
            {children}
          </pre>
        ),
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="my-2.5 border-l-2 border-indigo-300 bg-indigo-50/50 px-3 py-2 text-[13px] italic text-ink-600 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-ink-300"
            {...props}
          >
            {children}
          </blockquote>
        ),
        a: ({ children, ...props }) => (
          <a
            className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-500 dark:text-indigo-300"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-ink-200 dark:border-ink-700" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
