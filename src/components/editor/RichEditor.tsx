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
  List,
  ListOrdered,
  Quote,
  Code,
  Undo2,
  Redo2,
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
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-100',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn('rounded-xl border border-ink-200/80 bg-white', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-ink-200/80 px-2 py-1.5">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </Btn>
        <div className="mx-1 h-5 w-px bg-ink-200" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 className="h-3.5 w-3.5" />
        </Btn>
        <div className="mx-1 h-5 w-px bg-ink-200" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
          <Quote className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Código">
          <Code className="h-3.5 w-3.5" />
        </Btn>
        <div className="ml-auto flex items-center gap-0.5">
          <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
            <Undo2 className="h-3.5 w-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
            <Redo2 className="h-3.5 w-3.5" />
          </Btn>
        </div>
        <span className="ml-2 text-[10.5px] text-ink-400">
          {editor.storage.characterCount?.characters?.() ?? 0} caracteres
        </span>
      </div>

      {/* Conteúdo */}
      <div className="px-5 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}