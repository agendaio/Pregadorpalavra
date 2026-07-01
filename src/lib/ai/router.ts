import type { AIProvider, AIRequest, AIResponse } from './provider';
import { AIError } from './provider';
import { localProvider, LocalProvider } from './local';
import { openaiProvider, OpenAIProvider } from './openai';

/**
 * Router de providers — seleciona automaticamente o provedor ativo
 * baseado em configuração, disponibilidade de rede e prontidão.
 *
 * Estratégia:
 *  1. Tenta o provider configurado pelo usuário (default: openai)
 *  2. Se falhar por falta de chave → cai pro Local
 *  3. Se falhar por rede → cai pro Local e mostra aviso
 *  4. Se falhar por outro motivo → mostra erro específico
 */

export type ProviderId = 'openai' | 'local';

const PROVIDER_ATIVO_KEY = 'pregador.ai.provider';

export function obterProviderAtivoId(): ProviderId {
  const id = localStorage.getItem(PROVIDER_ATIVO_KEY) as ProviderId | null;
  return id === 'openai' || id === 'local' ? id : 'openai';
}

export function definirProviderAtivo(id: ProviderId): void {
  localStorage.setItem(PROVIDER_ATIVO_KEY, id);
}

export function listarProviders(): AIProvider[] {
  return [openaiProvider, localProvider];
}

export function obterProvider(id?: ProviderId): AIProvider {
  const idEfetivo = id ?? obterProviderAtivoId();
  if (idEfetivo === 'local') return localProvider;
  return openaiProvider;
}

/**
 * Envia a mensagem com fallback automático.
 * Se o provider ativo falhar e for recuperável (sem chave / rede),
 * tenta o Local automaticamente.
 */
export async function enviarComFallback(req: AIRequest): Promise<{
  response: AIResponse;
  providerUsado: string;
  fallbackUsado: boolean;
}> {
  const ativo = obterProviderAtivoId();
  const primario = obterProvider(ativo);

  try {
    const pr = await primario.pronto();
    if (!pr.ok) {
      // tenta fallback se for um erro recuperável
      if (ativo === 'openai') {
        const resp = await localProvider.enviar(req);
        return { response: resp, providerUsado: 'local', fallbackUsado: true };
      }
      throw new AIError(pr.motivo ?? 'Provedor indisponível', 'sem-chave', ativo);
    }

    const response = await primario.enviar(req);
    return { response, providerUsado: ativo, fallbackUsado: false };
  } catch (err) {
    if (err instanceof AIError) {
      // erros recuperáveis caem pro local
      const recuperavel = ['sem-chave', 'rede', 'provedor-indisponivel', 'rate-limit'].includes(err.code);
      if (recuperavel && ativo !== 'local') {
        const resp = await localProvider.enviar(req);
        return { response: resp, providerUsado: 'local', fallbackUsado: true };
      }
      throw err;
    }

    // FunctionsFetchError e outros erros não-Error nativos do browser/Supabase
    const errMsg = (err as Error).message ?? String(err);
    const errName = (err as Error).name ?? '';
    const recuperavel = ['rede', 'fetch', 'TypeError', 'FunctionsFetchError', 'AbortError'].some(
      (t) => errName.includes(t) || errMsg.includes(t),
    );
    if (recuperavel && ativo !== 'local') {
      try {
        const resp = await localProvider.enviar(req);
        return { response: resp, providerUsado: 'local', fallbackUsado: true };
      } catch {
        throw new AIError(errMsg.slice(0, 200), 'desconhecido', ativo);
      }
    }
    throw new AIError(errMsg.slice(0, 200), 'desconhecido', ativo);
  }
}