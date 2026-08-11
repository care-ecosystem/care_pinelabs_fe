export interface PlugConfigMeta {
  url?: string;
  name?: string;
  config?: {
    allow_advance_payment?: boolean;
    allow_partial_payment?: boolean;
    allow_manual_entry?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

declare global {
  interface Window {
    __CARE_PLUGIN_RUNTIME__: {
      meta: {
        [pluginSlug: string]: PlugConfigMeta;
      };
    };
  }
}
