import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import { User, Mail, UserCheck, UserCircle, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

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
    {
      label: 'profile.firstName',
      value: keycloak.tokenParsed?.given_name || t('profile.notAvailable'),
      icon: UserCheck,
    },
    {
      label: 'profile.lastName',
      value: keycloak.tokenParsed?.family_name || t('profile.notAvailable'),
      icon: UserCircle,
    },
  ];

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{t('profile.title')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{t('profile.userInformation')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Information Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {userInfo.map((info) => {
                const IconComponent = info.icon;
                return (
                  <div key={info.label} className="group">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                      {t(info.label)}
                    </p>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent group-hover:border-primary/10 group-hover:bg-white transition-all duration-200">
                      <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center flex-shrink-0 text-gray-400 group-hover:text-primary transition-colors">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <p className="text-base font-bold text-gray-900 truncate">{info.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Account Status Card */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <ShieldCheck className="w-4 h-4" />
              {t('profile.accountStatus')}
            </h3>

            <div className="space-y-6">
              {/* Active Status Badge */}
              <div className="flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100">
                <span className="text-sm font-bold uppercase tracking-tight">{t('profile.active')}</span>
                <CheckCircle2 className="w-5 h-5" />
              </div>

              {/* Email Verification */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
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
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Clock className="w-3 h-3" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest">
                      {t('profile.sessionStarted')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date((keycloak.tokenParsed.auth_time as number) * 1000).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

