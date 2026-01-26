import './i18n.ts';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactKeycloakProvider } from '@react-keycloak/web'
import './index.css'
import App from './App.tsx'
import keycloak from './keycloak'

const keycloakProviderInitConfig = {
  onLoad: 'login-required',
  checkLoginIframe: false,
  pkceMethod: 'S256' as const,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={keycloakProviderInitConfig}
    >
      <App />
    </ReactKeycloakProvider>
  </StrictMode>,
)
