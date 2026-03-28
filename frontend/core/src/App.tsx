import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import DashboardPage from './features/dashboard/DashboardPage';
import UploadPage from './features/upload/UploadPage';
import ProfilePage from './features/profile/ProfilePage';
import DownloadPage from './features/download/DownloadPage';
import AdminPage from './features/admin/AdminPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { configApi } from './services/api';
import type { ThemeConfig } from './services/api';
import { Loader2 } from 'lucide-react';

function App() {
  const { keycloak, initialized } = useKeycloak();
  const [instanceConfig, setInstanceConfig] = useState<ThemeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    configApi.getThemeConfig()
      .then(setInstanceConfig)
      .finally(() => setConfigLoading(false));
  }, []);

  if (!initialized || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br-primary">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  const isDownloadRoute = window.location.pathname.startsWith('/download/');
  if (!keycloak.authenticated && !(isDownloadRoute && !instanceConfig?.requireAuthForDownload)) {
    keycloak.login();
    return null;
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public route - no layout */}
          <Route path="/download/:accessId" element={<DownloadPage />} />

          {/* Protected routes - with layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminPage />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
