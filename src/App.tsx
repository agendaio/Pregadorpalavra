import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { LibraryPage } from '@/components/library/LibraryPage';
import { EditorPage } from '@/components/editor/EditorPage';
import { PulpitPage } from '@/components/pulpit/PulpitPage';
import { StudyPage } from '@/components/study/StudyPage';
import { AnalystPage } from '@/components/analyst/AnalystPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Toast } from '@/components/ui/Toast';
import { semearExemplos } from '@/db/seed';
import { initTema } from '@/stores/ui';

export function App() {
  useEffect(() => {
    initTema();
    semearExemplos();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Modo Púlpito é fullscreen, sem AppShell */}
        <Route path="/pulpit/:id" element={<PulpitPage />} />

        {/* Demais rotas usam o AppShell */}
        <Route
          path="*"
          element={
            <AppShell>
              <Routes>
                <Route path="/" element={<LibraryPage />} />
                <Route path="/editar/:id" element={<EditorPage />} />
                <Route path="/estudo" element={<StudyPage />} />
                <Route path="/analista" element={<AnalystPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}