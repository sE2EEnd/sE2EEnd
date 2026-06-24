import './i18n.ts';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactKeycloakProvider } from '@react-keycloak/web'
import './index.css'
import App from './App.tsx'
import keycloak from './keycloak'
import { registerStreamingServiceWorker } from './lib/streamDownload'
import type Keycloak from 'keycloak-js'

registerStreamingServiceWorker()

const keycloakProviderInitConfig = {
  onLoad: 'check-sso',
  checkLoginIframe: false,
  pkceMethod: 'S256' as const,
};

async function boot() {
  let activeKeycloak: Keycloak = keycloak;

  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { installDemo } = await import('./demo');
    activeKeycloak = await installDemo();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ReactKeycloakProvider
        authClient={activeKeycloak}
        initOptions={keycloakProviderInitConfig}
      >
        <App />
      </ReactKeycloakProvider>
    </StrictMode>,
  )
}

boot().catch((err) => {
  console.error('[boot] Fatal error during demo initialization:', err);
});
