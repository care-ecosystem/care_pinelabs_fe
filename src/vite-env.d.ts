/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_QR_CODE_EXPIRY_MS?: string;
  readonly VITE_DEFAULT_PAYMENT_LINK_EXPIRY_MS?: string;
}

declare global {
  const __CORE_ENV__: {
    readonly apiUrl: string;
  };
}
