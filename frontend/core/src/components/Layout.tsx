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
            <h1 className="text-2xl font-bold text-white tracking-tight">{theme?.appName}</h1>
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

          <div className={cn("p-4 border-t", themeClasses.sidebar.border)}>
            <div className={cn("flex items-center px-4 py-3 text-sm", themeClasses.text.light)}>
              <User className="w-5 h-5 mr-3" />
              <span className="truncate">{keycloak.tokenParsed?.preferred_username}</span>
            </div>
            <button
              onClick={handleLogout}
              className={cn("flex items-center w-full px-4 py-3 mt-2 text-sm font-medium rounded-lg transition-colors", themeClasses.sidebar.item.inactive)}
            >
              <LogOut className="w-5 h-5 mr-3" />
              {t('layout.logout')}
            </button>
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
              <h1 className="text-2xl font-bold text-white tracking-tight">{theme?.appName}</h1>
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

            <div className={cn("p-4 border-t", themeClasses.sidebar.border)}>
              <div className={cn("flex items-center px-4 py-3 text-sm", themeClasses.text.light)}>
                <User className="w-5 h-5 mr-3" />
                <span className="truncate">{keycloak.tokenParsed?.preferred_username}</span>
              </div>
              <button
                onClick={handleLogout}
                className={cn("flex items-center w-full px-4 py-3 mt-2 text-sm font-medium rounded-lg transition-colors", themeClasses.sidebar.item.inactive)}
              >
                <LogOut className="w-5 h-5 mr-3" />
                {t('layout.logout')}
              </button>
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
