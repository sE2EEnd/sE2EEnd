import { useState } from 'react';
import { useLocation, Outlet, Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Upload,
  User,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeClasses } from '../hooks/useThemeClasses';
import LanguageSwitcher from './LanguageSwitcher';

const menuItems = [
  { name: 'layout.dashboard', path: '/dashboard', icon: LayoutDashboard, role: null },
  { name: 'layout.upload', path: '/upload', icon: Upload, role: null },
  { name: 'layout.admin', path: '/admin', icon: Shield, role: 'admin' },
  { name: 'layout.profile', path: '/profile', icon: User, role: null },
];

export default function Layout() {
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme } = useTheme();
  const themeClasses = useThemeClasses();

  // Check if user has admin role
  const isAdmin = keycloak.tokenParsed?.realm_access?.roles?.includes('admin') || false;

  // Filter menu items based on role
  const visibleMenuItems = menuItems.filter(
    (item) => item.role === null || (item.role === 'admin' && isAdmin)
  );

  const handleLogout = () => {
    keycloak.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 shadow-xl transform transition-transform duration-300 lg:translate-x-0 hidden lg:block", themeClasses.sidebar.bg)}>
        <div className="flex flex-col h-full">
          <div className={cn("flex items-center justify-center h-16 px-4", themeClasses.sidebar.header)}>
            {theme?.logoUrl ? (
              <img src={theme.logoUrl} alt={theme.appName} className="h-10 rounded" />
            ) : (
              <h1 className="text-2xl font-bold text-white tracking-tight">{theme?.appName}</h1>
            )}
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? themeClasses.sidebar.item.active
                      : themeClasses.sidebar.item.inactive
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {t(item.name)}
                </Link>
              );
            })}
          </nav>

          <a
            href="https://github.com/sE2EEnd/sE2EEnd"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-5 py-2 text-white/40 hover:text-white/70 transition-colors text-xs"
          >
            <GitHubIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Open Source</span>
            <span className="ml-auto">{__APP_VERSION__}</span>
          </a>

          <div className={cn("p-4 border-t", themeClasses.sidebar.border)}>
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {(keycloak.tokenParsed?.preferred_username as string)?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className={cn("flex-1 text-sm font-medium truncate", themeClasses.text.light)}>
                {keycloak.tokenParsed?.preferred_username}
              </span>
              <button
                onClick={handleLogout}
                title={t('layout.logout')}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <aside className={cn("fixed inset-y-0 left-0 w-64 shadow-xl", themeClasses.sidebar.bg)}>
          <div className="flex flex-col h-full">
            <div className={cn("flex items-center justify-between h-16 px-4", themeClasses.sidebar.header)}>
              {theme?.logoUrl ? (
                <img src={theme.logoUrl} alt={theme.appName} className="h-10 rounded" />
              ) : (
                <h1 className="text-2xl font-bold text-white tracking-tight">{theme?.appName}</h1>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className={cn("text-white p-2 rounded-lg", themeClasses.hover.bg)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? themeClasses.sidebar.item.active
                        : themeClasses.sidebar.item.inactive
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {t(item.name)}
                  </Link>
                );
              })}
            </nav>

            <a
              href="https://github.com/sE2EEnd/sE2EEnd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2 text-white/40 hover:text-white/70 transition-colors text-xs"
            >
              <GitHubIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Open Source</span>
              <span className="ml-auto">v{__APP_VERSION__}</span>
            </a>

            <div className={cn("p-4 border-t", themeClasses.sidebar.border)}>
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {(keycloak.tokenParsed?.preferred_username as string)?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className={cn("flex-1 text-sm font-medium truncate", themeClasses.text.light)}>
                  {keycloak.tokenParsed?.preferred_username}
                </span>
                <button
                  onClick={handleLogout}
                  title={t('layout.logout')}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-semibold text-gray-900">
              {t(visibleMenuItems.find((item) => item.path === location.pathname)?.name || '')}
            </h2>

            <LanguageSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
