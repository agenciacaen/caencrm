/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHATWOOT_URL: string;
  readonly VITE_CHATWOOT_TOKEN: string;
  readonly VITE_CHATWOOT_ACCOUNT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
