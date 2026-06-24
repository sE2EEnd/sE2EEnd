import type Keycloak from 'keycloak-js';

export const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

export async function installDemo(): Promise<Keycloak> {
  const { demoKeycloak } = await import('./keycloak');
  const { installDemoAdapter } = await import('./adapter');
  const { installDemoFetch } = await import('./fetch');
  const { runSeedIfNeeded } = await import('./seed');

  installDemoAdapter();
  installDemoFetch();
  await runSeedIfNeeded();

  return demoKeycloak;
}
