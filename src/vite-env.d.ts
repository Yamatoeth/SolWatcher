/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HELIUS_API_KEY: string;
  // d'autres variables d'environnement...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
