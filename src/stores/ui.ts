import { create } from 'zustand';

type FontSize = 'pequeno' | 'medio' | 'grande';

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

  /** Tamanho da fonte */
  fonte: FontSize;
  setFonte: (f: FontSize) => void;
  alternarFonte: () => void;

  /** Busca universal aberta */
  buscaAberta: boolean;
  setBusca: (aberta: boolean) => void;

  /** Toast/snackbar */
  toast: { id: number; mensagem: string; tipo?: 'info' | 'sucesso' | 'erro' } | null;
  mostrarToast: (mensagem: string, tipo?: 'info' | 'sucesso' | 'erro') => void;
  limparToast: () => void;
}

const FONT_SIZE_CLASS: Record<FontSize, string> = {
  pequeno: 'font-sm',
  medio: 'font-md',
  grande: 'font-lg',
};

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  pequeno: 'Pequeno (14px)',
  medio: 'Médio (15px)',
  grande: 'Grande (17px)',
};

/** Aplica fonte root no <html> */
const aplicarFonte = (f: FontSize) => {
  const cls = FONT_SIZE_CLASS[f];
  const root = document.documentElement;
  (Object.values(FONT_SIZE_CLASS) as string[]).forEach((c) => root.classList.remove(c));
  root.classList.add(cls);
};

export { FONT_SIZE_LABELS };
export type { FontSize };

let toastId = 0;

export const useUIStore = create<UIState>((set, get) => ({
  sidebarAberta: true,
  toggleSidebar: () => set((s) => ({ sidebarAberta: !s.sidebarAberta })),
  setSidebar: (aberta) => set({ sidebarAberta: aberta }),

  // No desktop o painel de IA é uma sidebar fixa — abrir por padrão é bom UX.
  // No mobile ele vira um BottomSheet quase em tela cheia: abrir sozinho
  // toda vez que a página carrega parecia "a tela ficando em branco" ao
  // voltar pro editor. Detecta o tamanho da tela uma única vez na criação
  // da store (não persiste — cada load reavalia).
  iaAberta: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
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

  fonte: (localStorage.getItem('pregador.fonte') as FontSize) ?? 'medio',
  setFonte: (f) => {
    localStorage.setItem('pregador.fonte', f);
    aplicarFonte(f);
    set({ fonte: f });
  },
  alternarFonte: () => {
    const ordem: FontSize[] = ['pequeno', 'medio', 'grande'];
    const idx = ordem.indexOf(get().fonte);
    const proximo = ordem[(idx + 1) % ordem.length];
    get().setFonte(proximo);
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

/** Inicializa tema e fonte no carregamento */
export const initTema = () => {
  const t = useUIStore.getState().tema;
  document.documentElement.classList.toggle('dark', t === 'dark');
  const f = useUIStore.getState().fonte;
  aplicarFonte(f);
};