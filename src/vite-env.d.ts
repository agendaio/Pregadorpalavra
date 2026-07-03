/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Injetados no build (vite.config.ts → define). Identidade global da versão.
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: number;
declare const __APP_HASH__: string;
declare const __BUILD_TIME__: string;

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}