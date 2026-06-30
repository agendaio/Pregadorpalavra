import { create } from 'zustand';

/** Um bloco de conteúdo dentro de um capítulo (linha do púlpito) */
export interface Bloco {
  id: number;       // índice global único (0-based em toda a mensagem)
  texto: string;    // texto visível
}

/** Um capítulo do esboço com subtítulo opcional */
export interface Capitulo {
  id: number;       // índice na lista (0-based)
  titulo: string;  // texto do heading
  subTitulo?: string; // heading de nível 2 (opcional)
  blocos: Bloco[];  // linhas de conteúdo agrupadas
}

/** Estado do progresso de ministração */
export interface ProgressoState {
  /** Capítulos extraídos do esboço */
  capitulos: Capitulo[];
  /** Índices dos capítulos que estão abertos (expandidos) */
  capitulosAbertos: Set<number>;
  /** Índices dos capítulos já aplicados (concluídos — vermelho 40%) */
  capitulosFeitos: Set<number>;
  /** Índice do próximo capítulo a abrir (auto-advance) */
  proximoAAbrir: number;

  /** Actions */
  inicializar: (capitulos: Capitulo[]) => void;
  toggleCapitulo: (indice: number) => void;
  abrirCapitulo: (indice: number) => void;
  fecharCapitulo: (indice: number) => void;
  marcarFeitoEAvanca: (indice: number) => void;
  resetar: () => void;
  /** Retorna o capítulo atualmente "em pregação" (primeiro não-feito) */
  capituloAtual: () => Capitulo | null;
}

export const useProgressoStore = create<ProgressoState>((set, get) => ({
  capitulos: [],
  capitulosAbertos: new Set([0]), // primeiro capítulo começa aberto
  capitulosFeitos: new Set(),
  proximoAAbrir: 1,

  inicializar: (capitulos) => {
    if (capitulos.length === 0) return;
    set({
      capitulos,
      capitulosAbertos: new Set([0]),
      capitulosFeitos: new Set(),
      proximoAAbrir: 1,
    });
  },

  toggleCapitulo: (indice) => {
    const { capitulosAbertos, capitulosFeitos, capitulos } = get();
    const estaAberto = capitulosAbertos.has(indice);
    const estaFeito = capitulosFeitos.has(indice);

    if (estaFeito) {
      // Reabrir um capítulo já aplicado
      const novosFeitos = new Set(capitulosFeitos);
      novosFeitos.delete(indice);
      set({ capitulosAbertos: new Set([indice]), capitulosFeitos: novosFeitos });
      return;
    }

    if (estaAberto) {
      // Fechar = marcar como aplicado + avança pro próximo
      get().marcarFeitoEAvanca(indice);
    } else {
      // Abrir manualmente
      const novosAbertos = new Set(capitulosAbertos);
      novosAbertos.add(indice);
      set({ capitulosAbertos: novosAbertos });
    }
  },

  abrirCapitulo: (indice) => {
    const { capitulosAbertos } = get();
    const novosAbertos = new Set(capitulosAbertos);
    novosAbertos.add(indice);
    set({ capitulosAbertos: novosAbertos });
  },

  fecharCapitulo: (indice) => {
    const { capitulosAbertos } = get();
    const novosAbertos = new Set(capitulosAbertos);
    novosAbertos.delete(indice);
    set({ capitulosAbertos: novosAbertos });
  },

  marcarFeitoEAvanca: (indice) => {
    const { capitulosAbertos, capitulosFeitos, capitulos } = get();

    // Marca como feito
    const novosFeitos = new Set(capitulosFeitos);
    novosFeitos.add(indice);

    // Fecha o atual
    const novosAbertos = new Set(capitulosAbertos);
    novosAbertos.delete(indice);

    // Encontra o próximo capítulo não-feito
    let proximo = indice + 1;
    while (proximo < capitulos.length && novosFeitos.has(proximo)) {
      proximo++;
    }

    if (proximo < capitulos.length) {
      novosAbertos.add(proximo);
      set({
        capitulosAbertos: novosAbertos,
        capitulosFeitos: novosFeitos,
        proximoAAbrir: proximo,
      });
    } else {
      // Todos os capítulos feitos
      set({ capitulosAbertos: novosAbertos, capitulosFeitos: novosFeitos, proximoAAbrir: -1 });
    }
  },

  resetar: () => {
    const { capitulos } = get();
    if (capitulos.length === 0) return;
    set({
      capitulosAbertos: new Set([0]),
      capitulosFeitos: new Set(),
      proximoAAbrir: 1,
    });
  },

  capituloAtual: () => {
    const { capitulos, capitulosFeitos } = get();
    const primeiroNaoFeito = capitulos.findIndex((c) => !capitulosFeitos.has(c.id));
    return primeiroNaoFeito >= 0 ? capitulos[primeiroNaoFeito] : null;
  },
}));
