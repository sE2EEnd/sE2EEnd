import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import { useUploadForm } from './hooks/useUploadForm';
import UploadStepper from './components/UploadStepper';
import SecurityPanel from './components/SecurityPanel';
import ContentStep from './steps/ContentStep';
import ConfigStep from './steps/ConfigStep';
import UploadingStep from './steps/UploadingStep';
import ShareStep from './steps/ShareStep';

export default function UploadPage() {
  const { t } = useTranslation();
  const form = useUploadForm();

  const steps = [
    form.mode === 'file' ? t('upload.steps.selectFiles') : t('upload.steps.writeText'),
    t('upload.steps.configure'),
    t('upload.steps.upload'),
    t('upload.steps.share'),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('upload.title')} />

      <Card className="p-6">
        <UploadStepper steps={steps} activeStep={form.activeStep} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            {form.activeStep === 0 && (
              <ContentStep
                mode={form.mode}
                setMode={form.setMode}
                textContent={form.textContent}
                setTextContent={form.setTextContent}
                hideByDefault={form.hideByDefault}
                setHideByDefault={form.setHideByDefault}
                error={form.error}
                setError={form.setError}
                onFilesSelected={form.handleFilesSelected}
                onTextNext={form.handleTextNext}
              />
            )}
            {form.activeStep === 1 && (
              <ConfigStep
                mode={form.mode}
                selectedFiles={form.selectedFiles}
                removeFile={form.removeFile}
                textContent={form.textContent}
                sendName={form.sendName}
                setSendName={form.setSendName}
                maxDownloads={form.maxDownloads}
                setMaxDownloads={form.setMaxDownloads}
                expirationHours={form.expirationHours}
                setExpirationHours={form.setExpirationHours}
                usePassword={form.usePassword}
                setUsePassword={form.setUsePassword}
                requireSendPassword={form.requireSendPassword}
                passwordRef={form.passwordRef}
                passwordHasValue={form.passwordHasValue}
                setPasswordHasValue={form.setPasswordHasValue}
                error={form.error}
                uploading={form.uploading}
                onBack={form.goBack}
                onUpload={form.handleUpload}
              />
            )}
            {form.activeStep === 2 && <UploadingStep mode={form.mode} uploadProgress={form.uploadProgress} />}
            {form.activeStep === 3 && (
              <ShareStep
                mode={form.mode}
                shareLink={form.shareLink}
                usedPassword={form.usedPassword}
                onUploadAnother={form.reset}
              />
            )}
          </Card>
        </div>
        <div className="lg:col-span-1">
          <SecurityPanel />
        </div>
      </div>
    </div>
  );
}
