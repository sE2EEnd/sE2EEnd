import type Keycloak from 'keycloak-js';

const demoTokenParsed = {
  preferred_username: 'demo',
  given_name: 'Demo',
  email: 'demo@se2eend.local',
  email_verified: true,
  auth_time: Math.floor(Date.now() / 1000),
  realm_access: { roles: ['admin'] },
};

const demoKeycloak = {
  authenticated: true,
  token: 'demo-token',
  idToken: 'demo-id-token',
  tokenParsed: demoTokenParsed,
  // The provider sets onReady on the instance, then calls init().
  // We must invoke onReady ourselves (keycloak-js does it internally).
  init: () => {
    Promise.resolve().then(() => {
      if (typeof (demoKeycloak as unknown as Record<string, unknown>).onReady === 'function') {
        (demoKeycloak as unknown as Record<string, () => void>).onReady();
      }
    });
    return Promise.resolve(true);
  },
  login: () => Promise.resolve(),
  logout: () => { window.location.reload(); return Promise.resolve(); },
  updateToken: () => Promise.resolve(false),
  hasRealmRole: (role: string) => demoTokenParsed.realm_access.roles.includes(role),
  hasResourceRole: () => false,
  onReady: undefined as unknown,
  onAuthSuccess: undefined as unknown,
  onAuthError: undefined as unknown,
  onAuthRefreshSuccess: undefined as unknown,
  onAuthRefreshError: undefined as unknown,
  onAuthLogout: undefined as unknown,
  onTokenExpired: undefined as unknown,
} as unknown as Keycloak;

export { demoKeycloak };
