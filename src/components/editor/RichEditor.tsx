import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo2,
  Redo2,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Comece a escrever…' }),
      Typography,
      CharacterCount.configure({ limit: null }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // sincroniza quando o valor muda externamente (ex: carregar outra mensagem)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  // ─── Botão genérico da toolbar ─────────────────────────────────────────────
  const Btn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-8 min-w-[2.5rem] items-center justify-center gap-1 rounded-md px-1.5 text-[12px] font-semibold transition-colors',
        active
          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950'
          : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
      )}
    >
      {children}
    </button>
  );

  // ─── Botão de heading com indicador visual de nível ─────────────────────────
  const HeadingBtn = ({
    level,
    label,
    active,
    title,
  }: {
    level: 1 | 2 | 3;
    label: string;
    active?: boolean;
    title?: string;
  }) => (
    <button
      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
      title={title}
      className={cn(
        'flex h-8 min-w-[2.5rem] flex-col items-center justify-center gap-0 rounded-md px-1.5 text-[9.5px] font-bold leading-none transition-colors',
        active
          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950'
          : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
      )}
    >
      {/* Traço que indica o nível visualmente */}
      <span
        className={cn(
          'mb-0.5 block rounded-sm bg-current',
          level === 1 ? 'h-[3px] w-4' : level === 2 ? 'h-[2.5px] w-3.5' : 'h-[2px] w-3',
        )}
      />
      {label}
    </button>
  );

  return (
    <div className={cn('rounded-xl border border-ink-200/80 bg-white dark:border-ink-700 dark:bg-ink-900', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-ink-200/80 px-2 py-1.5 dark:border-ink-700">
        {/* Negrito / Itálico */}
        <Btn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Btn>

        <div className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

        {/* Heading buttons — capítulo / subtítulo / sub-subtítulo */}
        <HeadingBtn
          level={1}
          label="H1"
          active={editor.isActive('heading', { level: 1 })}
          title="Título de capítulo"
        />
        <HeadingBtn
          level={2}
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          title="Subtítulo — agrupa pontos dentro de um capítulo"
        />
        <HeadingBtn
          level={3}
          label="H3"
          active={editor.isActive('heading', { level: 3 })}
          title="Sub-subtítulo — organiza frases dentro de um subtítulo"
        />

        <div className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

        {/* Blocos especiais de conteúdo */}
        <Btn
          onClick={() => {
            editor.chain().focus().insertContent('<h3 class="conteudo-1"><span class="block-label">Conteúdo 1</span></h3><p class="conteudo-desc">Descrição do conteúdo 1 aqui...</p>').run();
          }}
          title="Conteúdo 1 com descrição"
          active={editor.isActive('heading', { level: 3 })}
        >
          <span className="text-[10px] font-bold">C1</span>
        </Btn>
        <Btn
          onClick={() => {
            editor.chain().focus().insertContent('<h3 class="conteudo-2"><span class="block-label">Conteúdo 2</span></h3><p class="conteudo-desc">Descrição do conteúdo 2 aqui...</p>').run();
          }}
          title="Conteúdo 2 com descrição"
        >
          <span className="text-[10px] font-bold">C2</span>
        </Btn>
        <Btn
          onClick={() => {
            editor.chain().focus().insertContent('<h3 class="pautas"><span class="block-label">Pautas</span></h3>').run();
          }}
          title="Pautas da ministração"
        >
          <span className="text-[10px] font-bold">PT</span>
        </Btn>

        <div className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

        {/* Listas */}
        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Lista com marcadores"
        >
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>

        <div className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

        {/* Citação / Código */}
        <Btn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Citação"
        >
          <Quote className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Bloco de código"
        >
          <Code className="h-3.5 w-3.5" />
        </Btn>

        {/* Separador horizontal */}
        <Btn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Linha horizontal"
        >
          <Minus className="h-3.5 w-3.5" />
        </Btn>

        <div className="ml-auto flex items-center gap-0.5">
          <Btn
            onClick={() => editor.chain().focus().undo().run()}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().redo().run()}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Btn>
        </div>
        <span className="ml-2 text-[10.5px] text-ink-400">
          {editor.storage.characterCount?.characters?.() ?? 0}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="px-5 py-4 dark:bg-ink-900">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
