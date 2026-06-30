import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/components/home/HomePage';
import { LibraryPage } from '@/components/library/LibraryPage';
import { EditorPage } from '@/components/editor/EditorPage';
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

// Admin
import { AdminLoginPage } from '@/admin/Login';
import { AdminShell } from '@/admin/AdminShell';
import { AdminDashboard } from '@/admin/Dashboard';
import { AdminUsers } from '@/admin/Users';
import { AdminPlans } from '@/admin/Plans';
import { AdminFeatures } from '@/admin/Features';
import { AdminApiKeys } from '@/admin/ApiKeys';
import { AdminUsage } from '@/admin/Usage';
import { AdminSubscriptions } from '@/admin/Subscriptions';
import { AdminNotifications } from '@/admin/Notifications';
import { AdminLogs } from '@/admin/Logs';
import { AdminSettings } from '@/admin/Settings';

/** Wrapper que permite AnimatePresence com React Router */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
        {/* Painel Admin — separado do app do pregador */}
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