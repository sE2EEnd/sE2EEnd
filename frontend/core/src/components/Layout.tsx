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

import { cn } from '@/lib/utils';
import GitHubIcon from './icons/GitHubIcon';
import { useTheme } from '@/contexts/ThemeContext';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Desktop */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 shadow-xl transform transition-transform duration-300 lg:translate-x-0 hidden lg:block", "bg-gradient-to-br-primary")}>
        <div className="flex flex-col h-full">
          <div className={cn("flex items-center justify-center h-16 px-4", "bg-black/20")}>
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
                      ? 'bg-white/20 text-white font-semibold shadow-md'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
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
            <span>Community Edition</span>
            <span className="ml-auto">{__APP_VERSION__}</span>
          </a>

          <div className={cn("p-4 border-t", "border-white/10")}>
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {(keycloak.tokenParsed?.preferred_username as string)?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className={cn("flex-1 text-sm font-medium truncate", "text-gray-100")}>
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
        <aside className={cn("fixed inset-y-0 left-0 w-64 shadow-xl", "bg-gradient-to-br-primary")}>
          <div className="flex flex-col h-full">
            <div className={cn("flex items-center justify-between h-16 px-4", "bg-black/20")}>
              {theme?.logoUrl ? (
                <img src={theme.logoUrl} alt={theme.appName} className="h-10 rounded" />
              ) : (
                <h1 className="text-2xl font-bold text-white tracking-tight">{theme?.appName}</h1>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className={cn("text-white p-2 rounded-lg", "hover:bg-primary-dark")}
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
                        ? 'bg-white/20 text-white font-semibold shadow-md'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
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

            <div className={cn("p-4 border-t", "border-white/10")}>
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {(keycloak.tokenParsed?.preferred_username as string)?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className={cn("flex-1 text-sm font-medium truncate", "text-gray-100")}>
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
        {/* Top Bar Mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <Menu className="w-6 h-6" />
            </button>

            <h2 className="text-lg font-bold text-primary tracking-tight">
              {theme?.appName}
            </h2>

            {/* Utility controls */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Utility bar Desktop */}
        <div className="hidden lg:flex justify-end items-center gap-1 px-10 pt-6">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        {/* Page Content */}
        <main className="p-6 lg:p-10 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
