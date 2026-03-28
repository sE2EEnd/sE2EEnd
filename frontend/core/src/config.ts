declare global {
  interface Window {
    __config: {
      keycloakUrl: string;
      keycloakRealm: string;
      keycloakClientId: string;
      apiUrl: string;
    };
  }
}

export const config = window.__config;
