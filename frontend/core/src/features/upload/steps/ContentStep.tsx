import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudUpload, Upload as UploadIcon, FileText, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';

interface ContentStepProps {
  mode: 'file' | 'text';
  setMode: (mode: 'file' | 'text') => void;
  textContent: string;
  setTextContent: (v: string) => void;
  hideByDefault: boolean;
  setHideByDefault: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  onFilesSelected: (files: File[]) => void;
  onTextNext: () => void;
}

export default function ContentStep({
  mode, setMode, textContent, setTextContent,
  hideByDefault, setHideByDefault,
  error, setError, onFilesSelected, onTextNext,
}: ContentStepProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [hideText, setHideText] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <Tabs value={mode} onValueChange={(v) => { setMode(v as 'file' | 'text'); setError(''); }}>
      <TabsList>
        <TabsTrigger value="file">
          <UploadIcon className="w-4 h-4" />
          {t('upload.tabs.file')}
        </TabsTrigger>
        <TabsTrigger value="text">
          <FileText className="w-4 h-4" />
          {t('upload.tabs.text')}
        </TabsTrigger>
      </TabsList>

      {/* File dropzone */}
      <TabsContent value="file" className="mt-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-primary hover:bg-primary/10'
          }`}
        >
          {isDragging ? (
            <div className="flex flex-col items-center">
              <CloudUpload className="w-20 h-20 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-primary">{t('upload.dropZone.dropHere')}</h3>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <CloudUpload className="w-20 h-20 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('upload.dropZone.dragDrop')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('upload.dropZone.or')}</p>
              <label className="px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium cursor-pointer">
                {t('upload.dropZone.browseFiles')}
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Text textarea */}
      <TabsContent value="text" className="mt-4 space-y-3">
        <div className="relative">
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            placeholder={t('upload.textForm.placeholder')}
            rows={8}
            className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm ${
              hideText ? 'text-transparent [text-shadow:0_0_8px_rgba(0,0,0,0.5)] select-none' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setHideText(v => !v)}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 dark:bg-gray-600/80 backdrop-blur-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-600 shadow-sm transition-all"
            title={hideText ? t('upload.textForm.showText') : t('upload.textForm.hideText')}
          >
            {hideText ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t('upload.textForm.summary', { count: textContent.length })}
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={hideByDefault}
            onChange={e => setHideByDefault(e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('upload.textForm.hideByDefault')}</span>
        </label>

        {error && (
          <Alert variant="error">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </Alert>
        )}

        <button
          onClick={onTextNext}
          className="w-full px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium"
        >
          {t('upload.steps.configure')} →
        </button>
      </TabsContent>
    </Tabs>
  );
}
