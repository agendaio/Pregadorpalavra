import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useAuthStore } from '@/stores/authUser';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, atualizarPerfil } = useAuthStore();

  const voltar = () => navigate('/mais');

  const [nome, setNome] = useState(user?.nome ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [igreja, setIgreja] = useState(user?.igreja ?? '');
  const [cidade, setCidade] = useState(user?.cidade ?? '');
  const [estado, setEstado] = useState(user?.estado ?? '');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  if (!user) {
    return (
      <div className="flex h-full flex-col bg-paper dark:bg-paper-dark">
        <MobileHeader title="Editar Perfil" back={voltar} />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-[14px] text-ink-500">Faça login para editar seu perfil.</p>
        </div>
      </div>
    );
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setMsg({ tipo: 'erro', texto: 'O nome é obrigatório.' });
      return;
    }

    setSalvando(true);
    setMsg(null);

    try {
      await atualizarPerfil({
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        igreja: igreja.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
      });
      setMsg({ tipo: 'ok', texto: 'Perfil atualizado com sucesso!' });
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-paper dark:bg-paper-dark">
      <MobileHeader title="Editar Perfil" back={voltar} />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">

          {/* Avatar placeholder */}
          <div className="flex flex-col items-center pt-2 pb-1">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-600 text-white shadow-lg">
                <span className="text-2xl font-bold">
                  {(nome || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <button
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink-800 text-white shadow-md active:scale-95 dark:bg-white dark:text-ink-800"
                title="Alterar foto (em breve)"
                disabled={true}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-[12px] text-ink-400 dark:text-ink-500">
              {user.email}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Campo
              label="Nome completo"
              value={nome}
              onChange={setNome}
              placeholder="Seu nome"
              autoComplete="name"
            />
            <Campo
              label="Telefone"
              value={telefone}
              onChange={setTelefone}
              placeholder="(00) 00000-0000"
              type="tel"
              autoComplete="tel"
            />
            <Campo
              label="Igreja"
              value={igreja}
              onChange={setIgreja}
              placeholder="Nome da sua igreja"
            />
            <div className="grid grid-cols-2 gap-3">
              <Campo
                label="Cidade"
                value={cidade}
                onChange={setCidade}
                placeholder="Cidade"
              />
              <Campo
                label="Estado"
                value={estado}
                onChange={setEstado}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          {/* Mensagem de feedback */}
          {msg && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium ${
                msg.tipo === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400'
              }`}
            >
              {msg.tipo === 'ok' ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {msg.texto}
            </div>
          )}

          {/* Botão salvar */}
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 py-3.5 text-[15px] font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-ink-500 dark:text-ink-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-[14px] text-ink-900 placeholder-ink-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-ink-800 dark:bg-ink-900 dark:text-white dark:placeholder-ink-600 dark:focus:border-blue-400"
      />
    </div>
  );
}
