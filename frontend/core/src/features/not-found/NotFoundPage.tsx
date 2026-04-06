import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br bg-gradient-to-br-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <p className="text-8xl font-black text-white/20 tracking-tighter select-none mb-2">404</p>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('notFound.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('notFound.description')}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('notFound.backHome')}
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-blue-100">
          <Shield className="w-4 h-4" />
          <span>sE2EEnd</span>
        </div>
      </div>
    </div>
  );
}
