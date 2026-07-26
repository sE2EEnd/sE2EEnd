declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
