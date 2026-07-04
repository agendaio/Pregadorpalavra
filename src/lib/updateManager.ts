/**
 * updateManager — entrega contínua (Continuous Delivery) para Web / PWA /
 * Android / iOS. Garante que todo deploy no Vercel chegue automaticamente a
 * todos os clientes, sem F5, sem limpar cache, sem reinstalar.
 *
 * Como funciona
 * ─────────────
 *  1. O service worker é registrado via `registerType: 'autoUpdate'`.
 *     Quando um novo deploy acontece, o SW baixa o precache atômico (só o que
 *     mudou) e ativa automaticamente com skipWaiting=true.
 *
 *  2. Polling a cada 30s (registration.update()) garante que o SW sempre
 *     verifique se há nova versão — mesmo sem navegação do usuário.
 *
 *  3. Detectamos a troca de SW pelo evento `controllerchange` no `navigator`.
 *     Isso acontece logo que o novo SW ativa — sem precisar comparar hashes
 *     do bundle (que ficam obsoletos no browser缓存ado).
 *
 *  3. O reload é automático e seguro: guarda em sessionStorage impede loop.
 *     Login, sessão, tema e dados locais sobrevivem ao reload porque o SW
 *     já tem a nova versão do bundle e tudo carrega corretamente.
 */
import { registerSW } from 'virtual:pwa-register';

export interface UpdateState {
  /** Há uma versão nova disponível e o SW já ativou. */
  updateAvailable: boolean;
  /** O reload já foi disparado — mostra "Atualizando…". */
  applying: boolean;
}

type Listener = (state: UpdateState) => void;

const RELOAD_GUARD = 'pregador.sw.reloaded'; // evita loop de reload

let registro: ServiceWorkerRegistration | undefined;
let estado: UpdateState = { updateAvailable: false, applying: false };
let iniciado = false;

const ouvintes = new Set<Listener>();

function emitir() {
  for (const l of ouvintes) l(estado);
}

function definir(patch: Partial<UpdateState>) {
  estado = { ...estado, ...patch };
  emitir();
}

/** Assina mudanças de estado. Retorna função pra cancelar. */
export function subscribeUpdates(listener: Listener): () => void {
  ouvintes.add(listener);
  listener(estado); // entrega o estado atual na hora
  return () => ouvintes.delete(listener);
}

export function getUpdateState(): UpdateState {
  return estado;
}

/**
 * Aplica a atualização: recarrega a página uma única vez.
 * O novo SW já ativou (skipWaiting=true), então o reload carrega o bundle novo.
 */
export async function applyUpdate(): Promise<void> {
  if (estado.applying) return;
  definir({ applying: true });
  try {
    if (sessionStorage.getItem(RELOAD_GUARD) === '1') return;
    sessionStorage.setItem(RELOAD_GUARD, '1');
    window.location.reload();
  } catch {
    // Falhou — mantém a versão anterior funcionando.
    definir({ applying: false });
  }
}

/** Dispara uma verificação imediata: força SW a baixar/atualizar. */
export function checkForUpdateNow(): void {
  // Força SW a recarregar — baixa nova versão se disponível
  if (registro?.active) {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
  }
  // Fallback: cutuca update via API
  void registro?.update().catch(() => {});
  // Se já detectou update, dispara reload automaticamente
  if (estado.updateAvailable) {
    void applyUpdate();
  }
}

/**
 * Inicializa o gerenciador. Idempotente — pode ser chamado mais de uma vez.
 *
 * Fluxo de atualização:
 *  1. SW novo termina de instalar com precache íntegro.
 *  2. SW ativa imediatamente (skipWaiting=true).
 *  3. `controllerchange` dispara — navigator.serviceWorker.controller muda.
 *  4. Detectamos a troca e mostramos "Atualizando…" + reload automático.
 */
export function startUpdateManager(): void {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;

  // Limpa a guarda de reload quando uma versão nova carrega com sucesso.
  window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_GUARD));

  // Corta reload em loop: se a página está sendo restaurada do bfcache,
  // sessionStorage ainda tem '1' da tentativa anterior.
  if (window.performance?.navigation?.type === 2) {
    sessionStorage.removeItem(RELOAD_GUARD);
  }

  // ── Registra SW não-bloqueante ──────────────────────────────────────────
  setTimeout(() => {
    if (typeof window === 'undefined') return;

    registerSW({
      immediate: false,
      onRegisteredSW(_url, registration) {
        // Sempre atualiza o registro, mesmo se active for null
        registro = registration ?? undefined;

        // Escuta a troca de SW: quando o novo ativa, recarrega.
        if (registration?.active) {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // navigator.serviceWorker.controller mudou → novo SW ativou.
            if (estado.updateAvailable || estado.applying) return;
            definir({ updateAvailable: true });
            // Auto-reload imediato quando SW novo ativa
            void applyUpdate();
          });
        }

        // ── Polling agressivo: cutuca SW a cada 30s ─────────────────────────
        // Garante que todo deploy chegue ao cliente, mesmo que ele não navegue
        // ou fique com a aba aberta por horas sem interação.
        const INTERVALO = 30_000; // 30 segundos
        const poll = () => {
          registration?.update().catch(() => {});
        };
        poll();                     // primeira verificação imediata
        setInterval(poll, INTERVALO);
      },
      onNeedRefresh() {
        // SW novo instalado e pronto para ativar.
        if (!estado.updateAvailable) {
          definir({ updateAvailable: true });
          // Auto-reload após respiro curto
          setTimeout(() => { void applyUpdate(); }, 1200);
        }
      },
    });
  }, 0);
}
