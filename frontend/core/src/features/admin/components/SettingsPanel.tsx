import { useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '@/services/api.ts';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';
import SectionHeader from '@/components/SectionHeader';

interface SettingsPanelProps {
  initialSettings: Record<string, string>;
}

export default function SettingsPanel({ initialSettings }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(initialSettings);
  const [pendingSettings, setPendingSettings] = useState<Record<string, string>>({});
  const [cronInput, setCronInput] = useState(initialSettings['cleanup_cron'] ?? '0 0 2 * * *');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const hasPendingChanges = Object.keys(pendingSettings).length > 0;
  const blocker = useBlocker(hasPendingChanges);

  const setPendingSetting = (key: string, value: string) => {
    setPendingSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSettingsLoading(true);
    try {
      await Promise.all(
        Object.entries(pendingSettings).map(([key, value]) => settingsApi.update(key, value))
      );
      setSettings(prev => ({ ...prev, ...pendingSettings }));
      setPendingSettings({});
      toast.success(t('admin.settings.saveSuccess'));
    } catch {
      toast.error(t('admin.settings.updateFailed'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDiscard = () => {
    setPendingSettings({});
    setCronInput(settings['cleanup_cron'] ?? '0 0 2 * * *');
  };

  const getBoolSetting = (key: string, defaultVal = 'true') =>
    pendingSettings[key] ?? settings[key] ?? defaultVal;

  return (
    <div className="space-y-4">
      <SectionHeader label={t('admin.settings.title')} icon={<ShieldCheck className="w-4 h-4" />} />
      <div className="flex flex-col gap-4">
        {/* Toggle: require auth for download */}
        <Card className="p-6 flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.requireAuthForDownload')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.requireAuthForDownloadDesc')}</p>
          </div>
          <button
            onClick={() => setPendingSetting('require_auth_for_download', getBoolSetting('require_auth_for_download') === 'true' ? 'false' : 'true')}
            disabled={settingsLoading}
            className={cn(
              'relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
              getBoolSetting('require_auth_for_download') === 'true' ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
            )}
          >
            <span className={cn(
              'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
              getBoolSetting('require_auth_for_download') === 'true' ? 'translate-x-7' : 'translate-x-1'
            )} />
          </button>
        </Card>

        {/* Toggle: require send password */}
        <Card className="p-6 flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.requireSendPassword')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.requireSendPasswordDesc')}</p>
          </div>
          <button
            onClick={() => setPendingSetting('require_send_password', getBoolSetting('require_send_password', 'false') === 'true' ? 'false' : 'true')}
            disabled={settingsLoading}
            className={cn(
              'relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
              getBoolSetting('require_send_password', 'false') === 'true' ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
            )}
          >
            <span className={cn(
              'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
              getBoolSetting('require_send_password', 'false') === 'true' ? 'translate-x-7' : 'translate-x-1'
            )} />
          </button>
        </Card>

        {/* Cron schedule */}
        <Card className="p-6 group hover:shadow-md transition-all space-y-4">
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.cleanupSchedule')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.cleanupScheduleDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: t('admin.settings.cleanupPresetNightly'), value: '0 0 2 * * *' },
              { label: t('admin.settings.cleanupPresetWeekly'), value: '0 0 2 * * 0' },
              { label: t('admin.settings.cleanupPresetDisabled'), value: 'disabled' },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => { setCronInput(preset.value); setPendingSetting('cleanup_cron', preset.value); }}
                disabled={settingsLoading}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50',
                  cronInput === preset.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary/40 hover:text-primary'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={cronInput}
              onChange={(e) => { setCronInput(e.target.value); setPendingSetting('cleanup_cron', e.target.value); }}
              disabled={settingsLoading}
              placeholder="0 0 2 * * *"
              className="flex-1 font-mono"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{t('admin.settings.cleanupCronHint')}</span>
          </div>
        </Card>
      </div>

      {/* Unsaved changes bar */}
      {hasPendingChanges && (
        <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-amber-800">{t('admin.settings.unsavedChanges')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              disabled={settingsLoading}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={settingsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('admin.settings.saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* Navigation blocker */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        icon={<AlertCircle className="w-6 h-6" />}
        iconVariant="info"
        title={t('admin.settings.leaveTitle')}
        description={t('admin.settings.leaveMessage')}
        confirmLabel={t('admin.settings.leaveConfirm')}
        cancelLabel={t('admin.settings.leaveCancel')}
      />
    </div>
  );
}
