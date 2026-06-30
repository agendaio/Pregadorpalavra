import { useState } from 'react';
import { Bell, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuthAdminStore } from '@/stores/authAdmin';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function AdminNotifications() {
  const admin = useAuthAdminStore((s) => s.admin);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<'info' | 'promo' | 'update' | 'aviso'>('info');
  const [enviando, setEnviando] = useState(false);
  const [audiencia, setAudiencia] = useState<'todos' | 'premium' | 'free'>('todos');

  const enviar = async () => {
    if (!titulo.trim() || !mensagem.trim() || !admin) return;
    const sb = supabase();
    if (!sb) return;
    setEnviando(true);
    try {
      // Por enquanto, loga no audit_logs (futura implementação: tabela notifications)
      const { error } = await sb.from('audit_logs').insert({
        admin_id: admin.id,
        acao: 'notification.sent',
        recurso: 'notification',
        detalhes: { titulo, mensagem, tipo, audiencia, preview: true },
      });
      if (error) throw error;
      mostrarToast('Notificação registrada (preview — distribuição real na Onda 5)', 'sucesso');
      setTitulo('');
      setMensagem('');
    } catch (e) {
      mostrarToast('Erro: ' + (e as Error).message, 'erro');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Notificações</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Envie avisos, promoções ou atualizações para os usuários
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
            <Bell className="h-4 w-4 text-emerald-400" />
            Compor notificação
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                Título
              </label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Novo recurso de exportação PDF"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                Mensagem
              </label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conteúdo da notificação…"
                rows={5}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                  Tipo
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as typeof tipo)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
                >
                  <option value="info">Informativo</option>
                  <option value="update">Atualização</option>
                  <option value="promo">Promoção</option>
                  <option value="aviso">Aviso</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                  Audiência
                </label>
                <select
                  value={audiencia}
                  onChange={(e) => setAudiencia(e.target.value as typeof audiencia)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
                >
                  <option value="todos">Todos os usuários</option>
                  <option value="premium">Apenas Premium/Pro</option>
                  <option value="free">Apenas Free</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => void enviar()}
              disabled={enviando || !titulo.trim() || !mensagem.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-2.5 text-[13px] font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar agora
            </button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
            Preview
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                  tipo === 'promo' && 'bg-amber-500/15 text-amber-300',
                  tipo === 'update' && 'bg-cyan-500/15 text-cyan-300',
                  tipo === 'aviso' && 'bg-red-500/15 text-red-300',
                  tipo === 'info' && 'bg-emerald-500/15 text-emerald-300',
                )}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">
                  {titulo || 'Título da notificação'}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-white/70">
                  {mensagem || 'Sua mensagem aparecerá aqui…'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10.5px] text-white/40">
                  <Sparkles className="h-3 w-3" />
                  <span>Pregador OS</span>
                  <span>·</span>
                  <span>agora</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-[11.5px] text-cyan-200">
            <strong>Preview:</strong> na próxima onda esta tela dispara push real via service
            worker e email. Por ora a ação é registrada no audit log.
          </div>
        </div>
      </div>
    </div>
  );
}