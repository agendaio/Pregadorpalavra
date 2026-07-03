/**
 * updateManager — entrega contínua (Continuous Delivery) para Web / PWA /
 * Android / iOS. Garante que todo deploy no Vercel chegue automaticamente a
 * todos os clientes, sem F5, sem limpar cache, sem reinstalar.
 *
 * Como funciona
 * ─────────────
 *  1. Registra o service worker em modo não-bloqueante.
 *     O Workbox faz o precache incremental (baixa só o que mudou) e a ativação
 *     é atômica: só vira a versão nova quando TODOS os arquivos estão íntegros.
 *
 *  2. Detecção de deploy independente do SW: consulta `/version.json` (servido
 *     sem cache) e compara o `hash` com o hash embutido neste bundle. A
 *     verificação é barata e disparada nos momentos certos — ao abrir, voltar
 *     pro app, focar a aba, reconectar à rede — com debounce.
 *     Não faz polling de rede no intervalo (isso é feito pelo SW internamente).
 *
 *  3. Quando há versão nova, o SW notifica via `onNeedRefresh`. O reload é
 *     único e controlado, preservando login, sessão, tema e dados locais.
 */
import { registerSW } from 'virtual:pwa-register';
import { APP_HASH } from '@/v.config';

export interface UpdateState {
  /** Há uma versão nova disponível (detectada por hash ou pelo SW). */
  updateAvailable: boolean;
  /** O reload já foi disparado — mostra "Atualizando…". */
  applying: boolean;
}

type Listener = (state: UpdateState) => void;

const VERSION_URL = '/version.json';
const DEBOUNCE_MS = 20_000; // no mínimo 20s entre checagens disparadas por foco/visibilidade
const RELOAD_GUARD = 'pregador.sw.reloaded'; // evita loop de reload

let updateSWFn: ((reload?: boolean) => Promise<void>) | null = null;
let registro: ServiceWorkerRegistration | undefined;
let estado: UpdateState = { updateAvailable: false, applying: false };
let ultimaChecagem = 0;
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
 * Aplica a atualização: manda SKIP_WAITING e recarrega uma única vez.
 * O `updateSW(true)` do vite-plugin-pwa já recarrega no `controllerchange`
 * (com guarda interna contra reload duplo).
 */
export async function applyUpdate(): Promise<void> {
  if (estado.applying) return;
  definir({ applying: true });
  try {
    if (updateSWFn) {
      await updateSWFn(true);
    } else {
      recarregarUmaVez();
    }
  } catch {
    // Falhou ao aplicar — mantém a versão anterior funcionando (seguro).
    definir({ applying: false });
  }
}

function recarregarUmaVez() {
  if (sessionStorage.getItem(RELOAD_GUARD) === '1') return;
  sessionStorage.setItem(RELOAD_GUARD, '1');
  window.location.reload();
}

/**
 * Consulta /version.json (sem cache) e compara o hash com o do bundle atual.
 * Se diferirem, marca atualização disponível e cutuca o SW pra baixar/instalar
 * o novo precache de forma atômica.
 */
async function verificarVersao(forcar = false): Promise<void> {
  const agora = Date.now();
  if (!forcar && agora - ultimaChecagem < DEBOUNCE_MS) return;
  ultimaChecagem = agora;

  try {
    const res = await fetch(`${VERSION_URL}?_=${agora}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { hash?: string };
    if (data.hash && APP_HASH && data.hash !== APP_HASH) {
      definir({ updateAvailable: true });
      await registro?.update().catch(() => {});
    }
  } catch {
    // Offline ou rede instável — ignora e tenta na próxima. Baixo custo.
  }
}

/** Dispara uma verificação imediata (usada por eventos externos, ex.: navegação). */
export function checkForUpdateNow(): void {
  void verificarVersao(true);
}

/**
 * Inicializa o gerenciador. Idempotente — pode ser chamado mais de uma vez.
 * O SW é registrado de forma NÃO-bloqueante (setTimeout) pra nunca congelar
 * a UI no momento do clique/navegação.
 */
export function startUpdateManager(): void {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;

  // Regista SW em background — não bloqueia thread, não congela cliques.
  // O SW faz o polling de updates internamente via workbox. Aqui só precisamos
  // detectar a sinalização de refresh via onNeedRefresh.
  setTimeout(() => {
    if (typeof window === 'undefined') return;
    updateSWFn = registerSW({
      // immediate: false → registro não-bloqueante; SW ativa quando puder.
      // Corrigia freeze ao clicar menu/navegar na PWA.
      immediate: false,
      onRegisteredSW(_url, reg) {
        registro = reg;
      },
      onNeedRefresh() {
        // SW novo instalado e pronto (precache íntegro). Sinal 100% confiável.
        definir({ updateAvailable: true });
      },
    });
  }, 0);

  // Após uma carga bem-sucedida da versão nova, libera a guarda de reload
  // pra permitir futuras atualizações no mesmo ciclo de vida da aba.
  window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_GUARD));

  const aoVoltarPraFrente = () => {
    if (document.visibilityState === 'visible') void verificarVersao();
  };

  // Momentos de verificação: abrir, voltar pro app, focar a aba, reconectar,
  // desbloquear o celular / restaurar do bfcache (pageshow).
  document.addEventListener('visibilitychange', aoVoltarPraFrente);
  window.addEventListener('focus', aoVoltarPraFrente);
  document.addEventListener('pageshow', aoVoltarPraFrente);
  window.addEventListener('online', () => void verificarVersao(true));

  // Checagem inicial na abertura.
  void verificarVersao(true);
}
