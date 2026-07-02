/**
 * CopilotOutline Store — Zustand
 *
 * Mantém o estado do esboço de pregação que é construído
 * automaticamente enquanto o usuário conversa com a IA.
 */

import { create } from 'zustand';
import type { SessionContext, PontoEsboço } from '@/types/copilotOutline';
import { SESSÃO_VAZIA } from '@/types/copilotOutline';

const STORAGE_KEY = 'pregador.copilotOutline';

function loadFromStorage(): Partial<SessionContext> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SessionContext>) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: SessionContext) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

interface CopilotOutlineState extends SessionContext {
  pastaId: string | null;
  pastaNome: string | null;
  pastaCor: string | null;
  setPasta: (id: string, nome: string, cor: string) => void;
  clearPasta: () => void;
  patchTitulo: (v: string) => void;
  patchSubtitulo: (v: string) => void;
  patchTema: (v: string) => void;
  patchObjetivo: (v: string) => void;
  patchTextoBase: (v: string) => void;
  patchPublico: (v: string) => void;
  patchSerie: (v: string) => void;
  patchIntroducao: (v: string) => void;
  patchConclusao: (v: string) => void;
  patchResumo: (v: string) => void;
  addPonto: (texto: string) => void;
  removePonto: (id: string) => void;
  patchPonto: (id: string, texto: string) => void;
  reorderPontos: (fromIndex: number, toIndex: number) => void;
  addSubponto: (pontoId: string, texto: string) => void;
  removeSubponto: (pontoId: string, index: number) => void;
  addAplicacao: (pontoId: string, texto: string) => void;
  removeAplicacao: (pontoId: string, index: number) => void;
  setTempoEstimado: (v: number) => void;
  setConversaId: (v: string) => void;
  reset: () => void;
  /** Importa um contexto completo (ex: do parse da resposta da IA) */
  importar: (ctx: Partial<SessionContext>) => void;
}

export const useCopilotOutlineStore = create<CopilotOutlineState>()((set, get) => {
  const stored = loadFromStorage();
  const initial: SessionContext = {
    ...SESSÃO_VAZIA,
    ...stored,
  };

  const persist = (partial: Partial<SessionContext>) => {
    saveToStorage({ ...get(), ...partial });
  };

  return {
    // ── Estado inicial ──────────────────────────────────────────────
    titulo: initial.titulo,
    subtitulo: initial.subtitulo,
    tema: initial.tema,
    objetivo: initial.objetivo,
    textoBase: initial.textoBase,
    publico: initial.publico,
    serie: initial.serie,
    introducao: initial.introducao,
    pontos: initial.pontos,
    conclusao: initial.conclusao,
    resumo: initial.resumo,
    tempoEstimado: initial.tempoEstimado,
    conversaId: initial.conversaId,
    // Pasta de esboço
    pastaId: null,
    pastaNome: null,
    pastaCor: null,

    // ── Pasta ─────────────────────────────────────────────────────
    setPasta: (id, nome, cor) => {
      set({ pastaId: id, pastaNome: nome, pastaCor: cor });
      // pastaId/pastaNome/pastaCor são campos extras (não em SessionContext)
      localStorage.setItem('pregador.pastaId', id ?? '');
      localStorage.setItem('pregador.pastaNome', nome ?? '');
      localStorage.setItem('pregador.pastaCor', cor ?? '');
    },
    clearPasta: () => {
      set({ pastaId: null, pastaNome: null, pastaCor: null });
      localStorage.removeItem('pregador.pastaId');
      localStorage.removeItem('pregador.pastaNome');
      localStorage.removeItem('pregador.pastaCor');
    },

    // ── Patches simples ────────────────────────────────────────────
    patchTitulo: (v) => {
      set({ titulo: v });
      persist({ titulo: v });
    },
    patchSubtitulo: (v) => {
      set({ subtitulo: v });
      persist({ subtitulo: v });
    },
    patchTema: (v) => {
      set({ tema: v });
      persist({ tema: v });
    },
    patchObjetivo: (v) => {
      set({ objetivo: v });
      persist({ objetivo: v });
    },
    patchTextoBase: (v) => {
      set({ textoBase: v });
      persist({ textoBase: v });
    },
    patchPublico: (v) => {
      set({ publico: v });
      persist({ publico: v });
    },
    patchSerie: (v) => {
      set({ serie: v });
      persist({ serie: v });
    },
    patchIntroducao: (v) => {
      set({ introducao: v });
      persist({ introducao: v });
    },
    patchConclusao: (v) => {
      set({ conclusao: v });
      persist({ conclusao: v });
    },
    patchResumo: (v) => {
      set({ resumo: v });
      persist({ resumo: v });
    },

    // ── Pontos ─────────────────────────────────────────────────────
    addPonto: (texto) => {
      const ponto: PontoEsboço = {
        id: crypto.randomUUID(),
        texto,
        subpontos: [],
        aplicacoes: [],
      };
      set((s) => ({ pontos: [...s.pontos, ponto] }));
      persist({ pontos: [...get().pontos] });
    },

    removePonto: (id) => {
      set((s) => ({ pontos: s.pontos.filter((p) => p.id !== id) }));
      persist({ pontos: get().pontos });
    },

    patchPonto: (id, texto) => {
      set((s) => ({
        pontos: s.pontos.map((p) => (p.id === id ? { ...p, texto } : p)),
      }));
      persist({ pontos: get().pontos });
    },

    reorderPontos: (fromIndex, toIndex) => {
      set((s) => {
        const pts = [...s.pontos];
        const [moved] = pts.splice(fromIndex, 1);
        pts.splice(toIndex, 0, moved);
        return { pontos: pts };
      });
      persist({ pontos: get().pontos });
    },

    addSubponto: (pontoId, texto) => {
      set((s) => ({
        pontos: s.pontos.map((p) =>
          p.id === pontoId ? { ...p, subpontos: [...p.subpontos, texto] } : p,
        ),
      }));
      persist({ pontos: get().pontos });
    },

    removeSubponto: (pontoId, index) => {
      set((s) => ({
        pontos: s.pontos.map((p) =>
          p.id === pontoId
            ? { ...p, subpontos: p.subpontos.filter((_, i) => i !== index) }
            : p,
        ),
      }));
      persist({ pontos: get().pontos });
    },

    addAplicacao: (pontoId, texto) => {
      set((s) => ({
        pontos: s.pontos.map((p) =>
          p.id === pontoId ? { ...p, aplicacoes: [...p.aplicacoes, texto] } : p,
        ),
      }));
      persist({ pontos: get().pontos });
    },

    removeAplicacao: (pontoId, index) => {
      set((s) => ({
        pontos: s.pontos.map((p) =>
          p.id === pontoId
            ? { ...p, aplicacoes: p.aplicacoes.filter((_, i) => i !== index) }
            : p,
        ),
      }));
      persist({ pontos: get().pontos });
    },

    setTempoEstimado: (v) => {
      set({ tempoEstimado: v });
      persist({ tempoEstimado: v });
    },

    setConversaId: (v) => {
      set({ conversaId: v });
      persist({ conversaId: v });
    },

    reset: () => {
      set(SESSÃO_VAZIA);
      localStorage.removeItem(STORAGE_KEY);
    },

    importar: (ctx) => {
      const next = { ...get(), ...ctx };
      set(next);
      persist(next);
    },
  };
});
