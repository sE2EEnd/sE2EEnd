import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import { User, Mail, ShieldCheck, Clock, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import SectionHeader from '@/components/SectionHeader';

export default function ProfilePage() {
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();

  const userInfo = [
    {
      label: 'profile.username',
      value: keycloak.tokenParsed?.preferred_username || t('profile.notAvailable'),
      icon: User,
    },
    {
      label: 'profile.email',
      value: keycloak.tokenParsed?.email || t('profile.notAvailable'),
      icon: Mail,
    },
  ];

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <PageHeader title={t('profile.title')} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Information Card */}
        <div className="space-y-8">
          <Card className="p-8">
            <SectionHeader color="muted" label={t('profile.userInformation')} icon={<UserCircle className="w-4 h-4" />} className="mb-6" />
            <div className="space-y-6">
              {userInfo.map((info) => {
                const IconComponent = info.icon;
                return (
                  <div key={info.label} className="group p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-transparent group-hover:border-primary/10 group-hover:bg-white dark:group-hover:bg-gray-700 transition-all duration-200">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                      {t(info.label)}
                    </p>
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" />
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{info.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>

        {/* Account Status Card */}
        <div className="space-y-8">
          <Card className="p-8">
            <SectionHeader color="muted" label={t('profile.accountStatus')} icon={<ShieldCheck className="w-4 h-4" />} className="mb-6" />

            <div className="space-y-6">
              {/* Email Verification */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                  {t('profile.emailVerified')}
                </p>
                <p className={cn(
                  "text-sm font-bold",
                  keycloak.tokenParsed?.email_verified ? 'text-green-600' : 'text-orange-600'
                )}>
                  {keycloak.tokenParsed?.email_verified ? t('profile.yes') : t('profile.no')}
                </p>
              </div>

              {/* Session Info */}
              {keycloak.tokenParsed?.auth_time && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-1">
                    <Clock className="w-3 h-3" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest">
                      {t('profile.sessionStarted')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {new Date((keycloak.tokenParsed.auth_time as number) * 1000).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
