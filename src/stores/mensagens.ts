import { create } from 'zustand';
import { db } from '@/db/schema';
import { novaMensagem, type Mensagem } from '@/types/mensagem';

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
  /** Limpa a atual */
  limpar: () => void;
  /** Mensagens favoritas fixadas */
  fixadas: Set<string>;
  toggleFixa: (id: string) => void;
}

export const useMensagensStore = create<MensagensState>((set, get) => ({
  atual: null,
  fixadas: new Set<string>(JSON.parse(localStorage.getItem('pregador.fixadas') ?? '[]')),

  carregar: async (id) => {
    const m = await db.mensagens.get(id);
    set({ atual: m ?? null });
  },

  nova: async () => {
    const m = novaMensagem({ titulo: 'Sem título' });
    await db.salvarMensagem(m);
    set({ atual: m });
    return m;
  },

  patch: (parcial) => {
    const { atual } = get();
    if (!atual) return;
    set({ atual: { ...atual, ...parcial, atualizadoEm: Date.now() } });
  },

  salvar: async () => {
    const { atual } = get();
    if (!atual) return;
    await db.salvarMensagem(atual);
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