import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Plus, Zap, WifiOff, Maximize2 } from 'lucide-react';

/**
 * InstallPrompt — card premium de instalação do PWA.
 *
 * Regras de exibição (o ponto mais importante: NÃO aparecer a cada acesso):
 *  - Nunca aparece se o app já está instalado (standalone) ou já foi instalado antes.
 *  - Só aparece depois de alguns segundos de uso (não é a primeira coisa na tela).
 *  - Se o usuário dispensar ("Agora não" / X), silencia por 14 dias.
 *  - Android/Chromium: usa o beforeinstallprompt real (sem popup do navegador).
 *  - iOS/Safari: mostra o passo a passo de "Adicionar à Tela de Início".
 */

const SNOOZE_KEY = 'pwa.install.snoozeUntil';
const DONE_KEY = 'pwa.install.done';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // 14 dias
const APARECER_APOS_MS = 200; // TEMP para screenshot

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function estaInstalado(): boolean {
  if (localStorage.getItem(DONE_KEY)) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari standalone
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

function estaSilenciado(): boolean {
  const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
  return Date.now() < until;
}

function ehIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [visivel, setVisivel] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [modo, setModo] = useState<'android' | 'ios' | null>(null);

  // ── Captura o evento de instalação do Chromium ─────────────────────────────
  useEffect(() => {
    if (estaInstalado() || estaSilenciado()) return;

    let timer: number | undefined;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // impede o mini-infobar/popup nativo
      setDeferred(e as BeforeInstallPromptEvent);
      setModo('android');
      timer = window.setTimeout(() => setVisivel(true), APARECER_APOS_MS);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS não dispara beforeinstallprompt — decidimos pelo user agent
    if (ehIOS()) {
      setModo('ios');
      timer = window.setTimeout(() => setVisivel(true), APARECER_APOS_MS);
    }

    const onInstalled = () => {
      localStorage.setItem(DONE_KEY, '1');
      setVisivel(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dispensar = useCallback(() => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setVisivel(false);
  }, []);

  const instalar = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DONE_KEY, '1');
    } else {
      // recusou no diálogo nativo — silencia por um tempo pra não insistir
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    }
    setDeferred(null);
    setVisivel(false);
  }, [deferred]);

  return (
    <AnimatePresence>
      {visivel && modo && (
        <>
          {/* Sem backdrop de propósito: um card discreto no rodapé é mais
              "app nativo" e menos enjoativo que escurecer a tela inteira só
              por causa de um convite pra instalar.
              Posicionamento no wrapper (CSS), não no motion — senão o transform
              do framer sobrescreve o -translate-x-1/2 e o card vaza pro canto. */}
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-[61] w-[calc(100%-24px)] max-w-md -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              role="dialog"
              aria-label="Instalar aplicativo"
              className="overflow-hidden rounded-3xl border border-ink-200/80 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900"
            >
              {/* Cabeçalho com ícone do app */}
              <div className="flex items-start gap-3.5 p-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 shadow-md dark:from-white dark:to-ink-200">
                  <img src="/icon-192.png" alt="Pregador OS" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-[15px] font-semibold tracking-tight text-ink-900 dark:text-white">
                    Instalar o Pregador OS
                  </div>
                  <div className="mt-0.5 text-[12.5px] leading-snug text-ink-500 dark:text-ink-400">
                    {modo === 'android'
                      ? 'Acesso rápido direto da sua tela inicial, como um app.'
                      : 'Adicione à tela de início e use como um aplicativo.'}
                  </div>
                </div>
                <button
                  onClick={dispensar}
                  aria-label="Agora não"
                  className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Benefícios */}
              <div className="grid grid-cols-3 gap-1 px-4 pb-1">
                <Beneficio icon={<Zap className="h-4 w-4" />} label="Mais rápido" />
                <Beneficio icon={<Maximize2 className="h-4 w-4" />} label="Tela cheia" />
                <Beneficio icon={<WifiOff className="h-4 w-4" />} label="Offline" />
              </div>

              {modo === 'android' ? (
                /* ── Android/Chromium: instalação em 1 toque ── */
                <div className="flex items-center gap-2 p-4 pt-3">
                  <button
                    onClick={dispensar}
                    className="flex-1 rounded-xl border border-ink-200 py-3 text-[13.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Agora não
                  </button>
                  <button
                    onClick={() => void instalar()}
                    className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-ink-900 py-3 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-ink-800 active:scale-[0.98] dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100"
                  >
                    <Download className="h-4 w-4" />
                    Instalar
                  </button>
                </div>
              ) : (
                /* ── iOS/Safari: passo a passo ── */
                <div className="px-4 pb-4 pt-2">
                  <ol className="space-y-2 rounded-2xl bg-ink-50 p-3 dark:bg-ink-800/50">
                    <PassoIOS n={1} icon={<Share className="h-3.5 w-3.5" />}>
                      Toque em <b>Compartilhar</b> na barra do Safari
                    </PassoIOS>
                    <PassoIOS n={2} icon={<Plus className="h-3.5 w-3.5" />}>
                      Escolha <b>Adicionar à Tela de Início</b>
                    </PassoIOS>
                    <PassoIOS n={3} icon={<Download className="h-3.5 w-3.5" />}>
                      Confirme em <b>Adicionar</b>
                    </PassoIOS>
                  </ol>
                  <button
                    onClick={dispensar}
                    className="mt-3 w-full rounded-xl border border-ink-200 py-3 text-[13.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Entendi
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Beneficio({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-ink-50/60 py-2.5 dark:bg-ink-800/40">
      <span className="text-ink-700 dark:text-ink-200">{icon}</span>
      <span className="text-[10.5px] font-medium text-ink-500 dark:text-ink-400">{label}</span>
    </div>
  );
}

function PassoIOS({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[12.5px] text-ink-700 dark:text-ink-200">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white dark:bg-white dark:text-ink-950">
        {n}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-ink-400">{icon}</span>
        <span>{children}</span>
      </span>
    </li>
  );
}
