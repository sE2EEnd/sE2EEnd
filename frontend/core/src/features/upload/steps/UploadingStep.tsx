import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadingStepProps {
  mode: 'file' | 'text';
  uploadProgress: { loaded: number; total: number } | null;
  finalizing?: boolean;
}

export default function UploadingStep({ mode, uploadProgress, finalizing }: UploadingStepProps) {
  const { t } = useTranslation();
  const percent = finalizing
    ? 100
    : uploadProgress && uploadProgress.total > 0
      ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100)
      : null;

  const title = finalizing
    ? t('upload.uploading.finalizingTitle')
    : mode === 'text' ? t('upload.uploading.titleText') : t('upload.uploading.title');

  const message = finalizing
    ? t('upload.uploading.finalizingMessage')
    : mode === 'text' ? t('upload.uploading.messageText') : t('upload.uploading.message');

  return (
    <div className="text-center py-12">
      <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      {percent !== null && (
        <div className="mt-6 mx-auto max-w-xs space-y-1">
          {!finalizing && uploadProgress && (
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{t('upload.uploading.progress', { loaded: uploadProgress.loaded, total: uploadProgress.total })}</span>
              <span>{percent}%</span>
            </div>
          )}
          <Progress value={percent} />
        </div>
      )}
    </div>
  );
}