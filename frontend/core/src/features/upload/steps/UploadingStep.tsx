import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadingStepProps {
  mode: 'file' | 'text';
  uploadProgress: { loaded: number; total: number } | null;
}

export default function UploadingStep({ mode, uploadProgress }: UploadingStepProps) {
  const { t } = useTranslation();
  const percent = uploadProgress && uploadProgress.total > 0
    ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100)
    : null;

  return (
    <div className="text-center py-12">
      <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {mode === 'text' ? t('upload.uploading.titleText') : t('upload.uploading.title')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {mode === 'text' ? t('upload.uploading.messageText') : t('upload.uploading.message')}
      </p>
      {percent !== null && (
        <div className="mt-6 mx-auto max-w-xs space-y-1">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{t('upload.uploading.progress', { loaded: uploadProgress!.loaded, total: uploadProgress!.total })}</span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} />
        </div>
      )}
    </div>
  );
}