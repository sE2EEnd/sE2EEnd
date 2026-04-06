import { useTranslation } from 'react-i18next';
import { Shield, Zap, Clock, Lock, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  { icon: Shield, titleKey: 'upload.security.endToEnd', descKey: 'upload.security.endToEndDesc' },
  { icon: Zap, titleKey: 'upload.security.zeroKnowledge', descKey: 'upload.security.zeroKnowledgeDesc' },
  { icon: Clock, titleKey: 'upload.security.autoDeletion', descKey: 'upload.security.autoDeletionDesc' },
  { icon: Lock, titleKey: 'upload.security.passwordProtection', descKey: 'upload.security.passwordProtectionDesc' },
  { icon: Download, titleKey: 'upload.security.downloadLimits', descKey: 'upload.security.downloadLimitsDesc' },
];

export default function SecurityPanel() {
  const { t } = useTranslation();
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('upload.security.title')}</h3>
      <div className="space-y-4">
        {features.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t(titleKey)}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
