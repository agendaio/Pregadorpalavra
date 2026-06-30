import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/components/home/HomePage';
import { LibraryPage } from '@/components/library/LibraryPage';
import { PulpitPage } from '@/components/pulpit/PulpitPage';
import { StudyPage } from '@/components/study/StudyPage';
import { AnalystPage } from '@/components/analyst/AnalystPage';
import { AboutPage } from '@/components/overview/AboutPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { MorePage } from '@/components/more/MorePage';
import { AssistantPage } from '@/components/assistant/AssistantPage';
import { OutlinesPage } from '@/components/outlines/OutlinesPage';
import { Toast } from '@/components/ui/Toast';
import { PWAUpdatePrompt } from '@/components/pwa/PWAUpdatePrompt';
import { semearExemplos } from '@/db/seed';
import { initTema } from '@/stores/ui';

// ── Code splitting: Editor (Tiptap é pesado) só carrega sob demanda ──
const EditorPage = lazy(() =>
  import('@/components/editor/EditorPage').then((m) => ({ default: m.EditorPage })),
);

// ── Code splitting: Admin inteiro fica em chunk separado ──
const AdminLoginPage = lazy(() =>
  import('@/admin/Login').then((m) => ({ default: m.AdminLoginPage })),
);
const AdminShell = lazy(() =>
  import('@/admin/AdminShell').then((m) => ({ default: m.AdminShell })),
);

// Admin children
const AdminDashboard      = lazy(() => import('@/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsers          = lazy(() => import('@/admin/Users').then((m) => ({ default: m.AdminUsers })));
const AdminPlans          = lazy(() => import('@/admin/Plans').then((m) => ({ default: m.AdminPlans })));
const AdminFeatures       = lazy(() => import('@/admin/Features').then((m) => ({ default: m.AdminFeatures })));
const AdminApiKeys        = lazy(() => import('@/admin/ApiKeys').then((m) => ({ default: m.AdminApiKeys })));
const AdminUsage          = lazy(() => import('@/admin/Usage').then((m) => ({ default: m.AdminUsage })));
const AdminSubscriptions  = lazy(() => import('@/admin/Subscriptions').then((m) => ({ default: m.AdminSubscriptions })));
const AdminNotifications  = lazy(() => import('@/admin/Notifications').then((m) => ({ default: m.AdminNotifications })));
const AdminLogs           = lazy(() => import('@/admin/Logs').then((m) => ({ default: m.AdminLogs })));
const AdminSettings       = lazy(() => import('@/admin/Settings').then((m) => ({ default: m.AdminSettings })));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
          {/* Painel Admin — chunk separado */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="features" element={<AdminFeatures />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
            <Route path="usage" element={<AdminUsage />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Modo Púlpito é fullscreen, sem AppShell */}
          <Route path="/pulpit/:id" element={<PulpitPage />} />

          {/* Demais rotas usam o AppShell (que decide mobile vs desktop) */}
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/biblioteca" element={<LibraryPage />} />
            <Route path="/esbocos" element={<OutlinesPage />} />
            <Route path="/assistente" element={<AssistantPage />} />
            <Route path="/mais" element={<MorePage />} />
            <Route path="/editar/:id" element={<EditorPage />} />
            <Route path="/estudo" element={<StudyPage />} />
            <Route path="/analista" element={<AnalystPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

/** Loading fallback mínimo — não flash, não barra de progresso (estilo nativo). */
function RouteFallback() {
  return (
    <div className="flex h-full min-h-screen-dvh items-center justify-center bg-paper dark:bg-paper-dark">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900 dark:border-ink-800 dark:border-t-white" />
    </div>
  );
}

export function App() {
  useEffect(() => {
    initTema();
    semearExemplos();
  }, []);

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <Toast />
      <PWAUpdatePrompt />
    </BrowserRouter>
  );
}
