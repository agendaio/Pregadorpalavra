import { create } from 'zustand';
import { db } from '@/db/schema';
import { novaMensagem, type Mensagem } from '@/types/mensagem';
import { gerarSlidesMinimos } from '@/lib/slideGenerator';

interface MensagensState {
  /** Mensagem em edição no editor */
  atual: Mensagem | null;
  /** Carrega mensagem para edição */
  carregar: (id: string) => Promise<void>;
  /** Inicia uma mensagem nova em branco */
  nova: () => Promise<Mensagem>;
  /** Patch em um campo da mensagem atual */
  patch: (parcial: Partial<Mensagem>) => void;
  /** Persiste a mensagem atual no IndexedDB */
  salvar: () => Promise<void>;
  /** Auto-save com debounce de 4 segundos */
  salvarDebounced: () => void;
  /** Cancela o debounce e salva imediatamente — usado antes de navegar pro Modo Púlpito */
  flushSalvar: () => Promise<void>;
  /** Limpa a atual */
  limpar: () => void;
  /** Mensagens favoritas fixadas */
  fixadas: Set<string>;
  toggleFixa: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useMensagensStore = create<MensagensState>((set, get) => ({
  atual: null,
  fixadas: new Set<string>(JSON.parse(localStorage.getItem('pregador.fixadas') ?? '[]')),

  carregar: async (id) => {
    const m = await db.mensagens.get(id);
    set({ atual: m ?? null });
  },

  nova: async () => {
    const m = novaMensagem({ titulo: 'Sem título' });
    // Gera slides mínimos automaticamente (capa + chamada + oração)
    m.slides = gerarSlidesMinimos(m);
    await db.salvarMensagem(m);
    set({ atual: m });
    return m;
  },

  patch: (parcial) => {
    const { atual } = get();
    if (!atual) return;
    // Garante que `slides` nunca seja undefined — evita crash no editor
    if (parcial.slides === undefined) delete parcial.slides;
    set({ atual: { ...atual, ...parcial, slides: atual.slides ?? [], atualizadoEm: Date.now() } });
    // Auto-save após 4 segundos de inatividade
    get().salvarDebounced();
  },

  salvar: async () => {
    const { atual } = get();
    if (!atual) return;
    await db.salvarMensagem(atual);
  },

  salvarDebounced: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void get().salvar();
    }, 4000); // 4 segundos
  },

  flushSalvar: async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await get().salvar();
  },

  limpar: () => set({ atual: null }),

  toggleFixa: (id) => {
    const fixadas = new Set(get().fixadas);
    if (fixadas.has(id)) fixadas.delete(id);
    else fixadas.add(id);
    localStorage.setItem('pregador.fixadas', JSON.stringify([...fixadas]));
    set({ fixadas });
  },
}));