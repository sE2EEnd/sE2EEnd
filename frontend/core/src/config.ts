declare global {
  interface Window {
    __config: {
      keycloakUrl: string;
      keycloakRealm: string;
      keycloakClientId: string;
    };
  }
}

export const config = window.__config;
