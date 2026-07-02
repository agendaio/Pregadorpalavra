/**
 * Página de Login/Cadastro para usuários.
 * Acessível pela rota /login
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authUser';
import { cn } from '@/lib/utils';

type Modo = 'login' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { login, signup, carregando, erro } = useAuthStore();

  // Lê query param: ?signup=true abre direto no cadastro
  const initialModo: Modo = search.get('signup') === 'true' ? 'signup' : 'login';
  const [modo, setModo] = useState<Modo>(initialModo);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const alternarModo = () => {
    setModo(modo === 'login' ? 'signup' : 'login');
    setErroLocal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLocal(null);

    if (!email || !senha) {
      setErroLocal('Preencha todos os campos');
      return;
    }

    if (modo === 'signup' && !nome) {
      setErroLocal('Informe seu nome');
      return;
    }

    if (senha.length < 6) {
      setErroLocal('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      if (modo === 'login') {
        await login(email, senha);
      } else {
        await signup(email, senha, nome);
      }
      navigate('/');
    } catch (err) {
      setErroLocal((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-paper to-ink-100 px-4 dark:from-ink-950 dark:to-ink-900">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 flex items-center gap-2 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Voltar</span>
      </button>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/30">
          <span className="text-3xl">📖</span>
        </div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Pregador OS</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {modo === 'login' ? 'Faça login para continuar' : 'Crie sua conta gratis'}
        </p>
      </div>

      {/* Form */}
      <motion.div
        key={modo}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {modo === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white py-3.5 pl-12 pr-4 text-ink-900 placeholder-ink-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-ink-800 dark:bg-ink-900/50 dark:text-white dark:placeholder-ink-600"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-ink-200 bg-white py-3.5 pl-12 pr-4 text-ink-900 placeholder-ink-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-ink-800 dark:bg-ink-900/50 dark:text-white dark:placeholder-ink-600"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-ink-200 bg-white py-3.5 pl-12 pr-12 text-ink-900 placeholder-ink-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-ink-800 dark:bg-ink-900/50 dark:text-white dark:placeholder-ink-600"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
            >
              {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {(erroLocal || erro) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
            >
              {erroLocal || erro}
            </motion.div>
          )}

          {modo === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    setErroLocal('Digite seu email acima para recuperar a senha');
                    return;
                  }
                  setErroLocal(null);
                  try {
                    const { supabase } = await import('@/lib/supabase');
                    const sb = supabase();
                    if (!sb) { setErroLocal('Servidor indisponível'); return; }
                    const { error } = await sb.auth.resetPasswordForEmail(email, {
                      redirectTo: window.location.origin + '/auth',
                    });
                    if (error) throw error;
                    setErroLocal(null);
                    alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
                  } catch (e) {
                    setErroLocal('Erro ao enviar email: ' + (e as Error).message);
                  }
                }}
                className="text-[12px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all',
              'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white',
              'hover:shadow-lg hover:shadow-emerald-500/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {carregando ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Aguarde...</span>
              </>
            ) : modo === 'login' ? (
              'Entrar'
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={alternarModo}
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            {modo === 'login'
              ? 'Nao tem conta? Cadastre-se gratis'
              : 'Ja tem conta? Faca login'}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-ink-400 dark:text-ink-500">
          Ao continuar, voce aceita nossos termos de uso.
          <br />
          Sua conta é gratuita e permanece ativa enquanto quiser.
        </p>
      </motion.div>
    </div>
  );
}
