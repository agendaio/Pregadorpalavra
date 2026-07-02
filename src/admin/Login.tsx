import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Sparkles, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useAuthAdminStore } from '@/stores/authAdmin';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';
import { APP_VERSION } from '@/v.config';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, inicializar, user, admin, carregando, erro } = useAuthAdminStore();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [submitErro, setSubmitErro] = useState<string | null>(null);

  useEffect(() => {
    void inicializar();
  }, [inicializar]);

  useEffect(() => {
    if (user && admin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, admin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErro(null);
    try {
      await login(email, senha);
    } catch (err) {
      const e = err as Error & { status?: number };
      let msg = e.message || 'Erro ao entrar';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email ou senha incorretos. Verifique se o Caps Lock está desligado.';
      } else if (msg.includes('Sem permissão')) {
        msg = 'Email logado, mas você NÃO é administrador. Peça acesso ao super_admin.';
      }
      setSubmitErro(msg);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white">
      {/* Fundo decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1.2 }}
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.4, delay: 0.2 }}
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-2xl shadow-emerald-500/30"
          >
            <Shield className="h-7 w-7" />
          </motion.div>
          <h1 className="text-[26px] font-bold tracking-tight">Painel Administrativo</h1>
          <p className="mt-1 text-[14px] text-white/60">Pregador OS · Acesso restrito</p>
        </div>

        {/* Card de login */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
          {!SUPABASE_CONFIGURED && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-semibold">Supabase não configurado.</div>
                <div className="mt-0.5 text-amber-300/80">
                  Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no
                  <code> .env</code> e nas variáveis de ambiente da Vercel.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/60">
                E-mail
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-emerald-500/50">
                <Mail className="h-4 w-4 flex-shrink-0 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pregador.os"
                  required
                  disabled={carregando}
                  className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/30 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/60">
                Senha
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-emerald-500/50">
                <Lock className="h-4 w-4 flex-shrink-0 text-white/40" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={carregando}
                  className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/30 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="text-[11px] text-white/40 hover:text-white/70"
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {/* Erro */}
            {(submitErro || erro) && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{submitErro || erro}</span>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={carregando || !SUPABASE_CONFIGURED}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-[11px] text-white/30">
          pregadorpalavra.vercel.app/admin · v{APP_VERSION}
        </div>
      </motion.div>
    </div>
  );
}