import Dexie, { type Table } from 'dexie';
import type { Mensagem, MensagemHistorico, Serie, Tag } from '@/types/mensagem';

/**
 * Banco local do Pregador OS.
 *
 * Offline-first: tudo é gravado primeiro aqui. Quando a sincronização
 * com Supabase estiver ativa, ela envia apenas deltas.
 *
 * Princípios:
 * - Cada mensagem tem um version monotônico.
 * - Histórico guarda snapshots antes de cada edição (cap por mensagem).
 * - Buscas por campos indexados são instantâneas (milissegundos).
 */
class PregadorDB extends Dexie {
  mensagens!: Table<Mensagem, string>;
  historico!: Table<MensagemHistorico, string>;
  series!: Table<Serie, string>;
  tags!: Table<Tag, string>;

  constructor() {
    super('PregadorOS');

    this.version(1).stores({
      // & = chave primária, índices secundários abaixo
      mensagens: '&id, titulo, tema, status, favorita, serie, livroBiblico, criadoEm, atualizadoEm, dataPregacao, *tags, *personagens',
      historico: '&id, mensagemId, versao, criadoEm',
      series: '&id, nome, criadoEm',
      tags: '&id, &nome',
    });
  }

  /**
   * Salva uma mensagem criando snapshot anterior quando há mudança real.
   * Mantém no máximo 50 versões por mensagem para não estourar storage.
   */
  async salvarMensagem(m: Mensagem): Promise<void> {
    const existente = await this.mensagens.get(m.id);
    const proximaVersao = (existente?.versao ?? 0) + 1;
    const agora = Date.now();
    const atualizada: Mensagem = {
      ...m,
      versao: existente ? proximaVersao : 1,
      atualizadoEm: agora,
      criadoEm: existente?.criadoEm ?? agora,
    };

    if (existente) {
      // snapshot leve do estado anterior
      await this.historico.add({
        id: crypto.randomUUID(),
        mensagemId: existente.id,
        versao: existente.versao,
        snapshot: {
          ...existente,
          arquivos: existente.arquivos.map((a) => ({
            id: a.id,
            tipo: a.tipo,
            titulo: a.titulo,
          })),
        },
        criadoEm: agora,
      });
      // limita histórico
      const antigos = await this.historico
        .where('mensagemId')
        .equals(existente.id)
        .reverse()
        .sortBy('versao');
      if (antigos.length > 50) {
        const paraRemover = antigos.slice(50).map((h) => h.id);
        await this.historico.bulkDelete(paraRemover);
      }
    }

    await this.mensagens.put(atualizada);
  }

  async removerMensagem(id: string): Promise<void> {
    await this.transaction('rw', this.mensagens, this.historico, async () => {
      await this.mensagens.delete(id);
      await this.historico.where('mensagemId').equals(id).delete();
    });
  }
}

export const db = new PregadorDB();

/** ID de dispositivo estável para futuro sync multi-device */
export const getDeviceId = (): string => {
  const chave = 'pregador.deviceId';
  let id = localStorage.getItem(chave);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(chave, id);
  }
  return id;
};