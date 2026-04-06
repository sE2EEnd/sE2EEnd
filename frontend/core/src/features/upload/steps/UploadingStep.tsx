import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export default function UploadingStep({ mode }: { mode: 'file' | 'text' }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12">
      <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {mode === 'text' ? t('upload.uploading.titleText') : t('upload.uploading.title')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {mode === 'text' ? t('upload.uploading.messageText') : t('upload.uploading.message')}
      </p>
    </div>
  );
}
