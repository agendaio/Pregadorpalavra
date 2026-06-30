import { create } from 'zustand';

interface UIState {
  /** Painel lateral (biblioteca/sidebar) */
  sidebarAberta: boolean;
  toggleSidebar: () => void;
  setSidebar: (aberta: boolean) => void;

  /** Painel de IA aberto no editor */
  iaAberta: boolean;
  toggleIA: () => void;
  setIA: (aberta: boolean) => void;

  /** Tema */
  tema: 'light' | 'dark';
  setTema: (t: 'light' | 'dark') => void;
  alternarTema: () => void;

  /** Busca universal aberta */
  buscaAberta: boolean;
  setBusca: (aberta: boolean) => void;

  /** Toast/snackbar */
  toast: { id: number; mensagem: string; tipo?: 'info' | 'sucesso' | 'erro' } | null;
  mostrarToast: (mensagem: string, tipo?: 'info' | 'sucesso' | 'erro') => void;
  limparToast: () => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set, get) => ({
  sidebarAberta: true,
  toggleSidebar: () => set((s) => ({ sidebarAberta: !s.sidebarAberta })),
  setSidebar: (aberta) => set({ sidebarAberta: aberta }),

  iaAberta: true,
  toggleIA: () => set((s) => ({ iaAberta: !s.iaAberta })),
  setIA: (aberta) => set({ iaAberta: aberta }),

  tema: (localStorage.getItem('pregador.tema') as 'light' | 'dark') ?? 'light',
  setTema: (t) => {
    localStorage.setItem('pregador.tema', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    set({ tema: t });
  },
  alternarTema: () => {
    const novo = get().tema === 'light' ? 'dark' : 'light';
    get().setTema(novo);
  },

  buscaAberta: false,
  setBusca: (aberta) => set({ buscaAberta: aberta }),

  toast: null,
  mostrarToast: (mensagem, tipo = 'info') => {
    const id = ++toastId;
    set({ toast: { id, mensagem, tipo } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 2400);
  },
  limparToast: () => set({ toast: null }),
}));

/** Inicializa tema no carregamento */
export const initTema = () => {
  const t = useUIStore.getState().tema;
  document.documentElement.classList.toggle('dark', t === 'dark');
};