import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import { User, Mail, UserCheck, UserCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('profile.title')}</h1>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Information Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.userInformation')}</h2>

            <div className="space-y-5">
              {userInfo.map((info) => {
                const IconComponent = info.icon;
                return (
                  <div key={info.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {t(info.label)}
                      </p>
                      <p className="text-base font-medium text-gray-900 truncate">{info.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Account Status Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.accountStatus')}</h2>

            <div className="space-y-4">
              {/* Active Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {t('profile.active')}
              </div>

              {/* Email Verification */}
              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-700">{t('profile.emailVerified')}:</span>
                  <span
                    className={`font-semibold ${
                      keycloak.tokenParsed?.email_verified ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {keycloak.tokenParsed?.email_verified ? t('profile.yes') : t('profile.no')}
                  </span>
                </div>
              </div>

              {/* Account Created (if available) */}
              {keycloak.tokenParsed?.iat && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {t('profile.sessionStarted')}
                  </p>
                  <p className="text-sm text-gray-900">
                    {new Date((keycloak.tokenParsed.iat as number) * 1000).toLocaleString()}
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
