import { create } from 'zustand';

export interface PulpitState {
  ativa: boolean;
  /** Linhas marcadas pelo pregador (apenas durante a ministração) */
  linhasMarcadas: Set<number>;
  /** Modo de marcação: clique individual vs arrastar */
  arrastando: boolean;
  /** Cronômetro */
  iniciadaEm: number | null;
  pausada: boolean;
  tempoPausadoMs: number;
  /** Configurações do modo púlpito */
  tamanhoFonte: number; // px
  setTamanhoFonte: (n: number) => void;
  /** Ações */
  entrar: () => void;
  sair: () => void;
  toggleLinha: (indice: number) => void;
  iniciarArrasto: () => void;
  pararArrasto: () => void;
  marcarRange: (de: number, ate: number) => void;
  desmarcarTudo: () => void;
  /** Cronômetro */
  iniciar: () => void;
  pausar: () => void;
  resetar: () => void;
  /** Snapshot para uso com requestAnimationFrame */
  tick: number;
  tickAgora: () => void;
}

export const usePulpitStore = create<PulpitState>((set, get) => ({
  ativa: false,
  linhasMarcadas: new Set(),
  arrastando: false,
  iniciadaEm: null,
  pausada: false,
  tempoPausadoMs: 0,
  tamanhoFonte: 32,
  tick: 0,

  setTamanhoFonte: (n) => set({ tamanhoFonte: Math.max(18, Math.min(96, n)) }),

  entrar: () => set({ ativa: true, linhasMarcadas: new Set(), iniciadaEm: null, pausada: false, tempoPausadoMs: 0 }),
  sair: () => set({ ativa: false }),

  toggleLinha: (indice) => {
    const marcadas = new Set(get().linhasMarcadas);
    if (marcadas.has(indice)) marcadas.delete(indice);
    else marcadas.add(indice);
    set({ linhasMarcadas: marcadas });
  },

  iniciarArrasto: () => set({ arrastando: true }),
  pararArrasto: () => set({ arrastando: false }),

  marcarRange: (de, ate) => {
    const marcadas = new Set(get().linhasMarcadas);
    const [a, b] = de <= ate ? [de, ate] : [ate, de];
    for (let i = a; i <= b; i++) marcadas.add(i);
    set({ linhasMarcadas: marcadas });
  },

  desmarcarTudo: () => set({ linhasMarcadas: new Set() }),

  iniciar: () => set({ iniciadaEm: Date.now(), pausada: false, tempoPausadoMs: 0 }),
  pausar: () => {
    const { iniciadaEm, pausada } = get();
    if (!iniciadaEm || pausada) return;
    set({ pausada: true, tempoPausadoMs: Date.now() - iniciadaEm });
  },
  resetar: () => set({ iniciadaEm: null, pausada: false, tempoPausadoMs: 0 }),
  tickAgora: () => set({ tick: Date.now() }),
}));