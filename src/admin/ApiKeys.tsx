import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Trash2,
  Cpu,
  Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: string;
  provider: string;
  modelo_padrao: string | null;
  ativo: boolean;
  criado_em: string;
  /** A key completa NUNCA aparece — só masked */
  key_ciphertext_preview?: string;
}

export function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novaKey, setNovaKey] = useState('');
  const [novoModelo, setNovoModelo] = useState('gpt-4o-mini');
  const [novoProvider, setNovoProvider] = useState('openai');
  const [mostrarNova, setMostrarNova] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

  useEffect(() => {
    void carregar();
  }, []);

  const carregar = async () => {
    const sb = supabase();
    if (!sb) {
      setErro('Supabase não configurado.');
      setCarregando(false);
      return;
    }
    try {
      const { data, error } = await sb
        .from('api_keys')
        .select('id, provider, modelo_padrao, ativo, criado_em, key_ciphertext')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setKeys(
        (data ?? []).map((k: any) => ({
          ...k,
          key_ciphertext_preview: '••••••••' + (k.key_ciphertext?.slice(-6) ?? ''),
        })),
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async () => {
    if (!novaKey.trim()) {
      setStatus({ tipo: 'erro', msg: 'Cole uma chave válida' });
      return;
    }
    const sb = supabase();
    if (!sb) return;

    setSalvando(true);
    setStatus(null);
    try {
      // Edge Function chamada via supabase.functions.invoke com auth
      // Aqui faremos direto: insere na tabela via service-role (precisa de admin client)
      // Como estamos no client, vamos chamar uma edge function helper
      const { data, error } = await sb.functions.invoke('save-api-key', {
        body: {
          provider: novoProvider,
          key: novaKey.trim(),
          modelo_padrao: novoModelo,
        },
      });

      if (error) {
        // Fallback: tentar insert direto (se RLS permitir via policy admin_write)
        const { error: insertErr } = await sb.from('api_keys').insert({
          provider: novoProvider,
          key_ciphertext: novaKey.trim(),
          modelo_padrao: novoModelo,
          ativo: true,
        });
        if (insertErr) throw insertErr;
      }

      setStatus({ tipo: 'ok', msg: `Chave ${novoProvider} salva com sucesso${data ? ' (criptografada)' : ''}` });
      setNovaKey('');
      await carregar();
    } catch (e) {
      setStatus({ tipo: 'erro', msg: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  };

  const desativar = async (k: ApiKey) => {
    if (!confirm(`Desativar a chave ${k.provider}? Os usuários cairão no fallback local.`)) return;
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.from('api_keys').update({ ativo: false }).eq('id', k.id);
    if (error) {
      setErro(error.message);
    } else {
      void carregar();
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">API Keys</h1>
        <p className="mt-1 text-[13px] text-white/50">
          Chaves centralizadas — usuários não precisam fornecer suas próprias
        </p>
      </div>

      {/* Aviso importante */}
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
          <div className="text-[12.5px] text-cyan-100">
            <strong className="font-semibold">Como funciona:</strong> as chaves ficam
            armazenadas no servidor Supabase e são lidas pela Edge Function
            <code className="mx-1 rounded bg-black/30 px-1">ai-chat</code>
            quando um usuário faz uma requisição. O usuário final <strong>nunca</strong>
            vê sua chave. Em produção, idealmente criptografe com pgcrypto antes de salvar.
          </div>
        </div>
      </div>

      {/* Form para nova chave */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
          <Plus className="h-4 w-4 text-emerald-400" />
          Cadastrar nova chave
        </h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              Provider
            </label>
            <select
              value={novoProvider}
              onChange={(e) => setNovoProvider(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
            >
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              Modelo padrão
            </label>
            <input
              value={novoModelo}
              onChange={(e) => setNovoModelo(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              API Key
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
              <input
                type={mostrarNova ? 'text' : 'password'}
                value={novaKey}
                onChange={(e) => setNovaKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 bg-transparent px-1 py-1 font-mono text-[12px] outline-none placeholder:text-white/30"
              />
              <button
                onClick={() => setMostrarNova(!mostrarNova)}
                className="rounded p-1 text-white/40 hover:text-white"
              >
                {mostrarNova ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {status && (
          <div
            className={cn(
              'mt-3 flex items-start gap-2 rounded-lg p-2.5 text-[12px]',
              status.tipo === 'ok'
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border border-red-500/30 bg-red-500/10 text-red-200',
            )}
          >
            {status.tipo === 'ok' ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span>{status.msg}</span>
          </div>
        )}

        <button
          onClick={() => void salvar()}
          disabled={salvando || !novaKey.trim()}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-2 text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-50"
        >
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar chave
        </button>
      </div>

      {/* Lista de chaves */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
          Chaves cadastradas ({keys.length})
        </h2>
        {carregando ? (
          <div className="flex h-32 items-center justify-center text-white/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-[12.5px] text-red-200">
            {erro}
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center text-[13px] text-white/40">
            Nenhuma chave cadastrada
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-slate-900/60 p-4 backdrop-blur-sm',
                  k.ativo ? 'border-emerald-500/30' : 'border-white/10 opacity-60',
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    k.ativo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/40',
                  )}
                >
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold capitalize">{k.provider}</span>
                    {k.ativo ? (
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        Ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-white/40">
                    <span className="font-mono">{k.key_ciphertext_preview}</span>
                    {k.modelo_padrao && <span>· {k.modelo_padrao}</span>}
                  </div>
                </div>
                {k.ativo && (
                  <button
                    onClick={() => void desativar(k)}
                    className="rounded-lg p-2 text-white/40 hover:bg-red-500/20 hover:text-red-400"
                    aria-label="Desativar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}