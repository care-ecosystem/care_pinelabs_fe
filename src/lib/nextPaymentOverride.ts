import type { ComponentType } from "react";

/**
 * Discovery of other plugins overriding the same component.
 *
 * Care renders only the single highest-priority override for a component
 * (`care_fe/src/lib/override/register.ts`) and injects `__base` pointing at the
 * *native* component — never at the next override in the priority order. Since
 * this plugin is always registered at priority 10, every other plugin's payment
 * override is shadowed and would never render.
 *
 * The host does not expose the override registry (`window.__careOverrides` is
 * write-only), but it does publish every enabled plugin's meta — including its
 * remoteEntry URL — on `window.__CARE_PLUGIN_RUNTIME__`. Re-importing that URL
 * hits the browser's module cache, so we get back the exact module instance the
 * host already initialised: same React, same shared scope, same component
 * identity. That lets us read the other plugin's manifest and render its
 * override ourselves when the user switches away from the Pinelabs flow.
 */

const OVERRIDE_KEY = "PaymentReconciliationSheet";
const MANIFEST_EXPOSE = "./manifest";

type FederatedRemote = {
  get?: (module: string) => Promise<() => unknown>;
};

type RemoteOverride = {
  component?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replacement?: ComponentType<any>;
  priority?: number;
};

type RemoteManifest = {
  overrides?: readonly RemoteOverride[];
};

export type NextPaymentOverride = {
  slug: string;
  priority: number;
  component: ComponentType<any>;
};

// Mirrors `__federation_method_unwrapDefault` from @originjs/vite-plugin-federation.
const unwrapDefault = (module: unknown) => {
  const candidate = module as
    | { __esModule?: boolean; default?: unknown }
    | undefined;
  const isModule =
    !!candidate?.__esModule ||
    (module as { [Symbol.toStringTag]?: string })?.[Symbol.toStringTag] ===
      "Module";
  return isModule ? candidate?.default : module;
};

const loadRemoteManifest = async (
  url: string
): Promise<RemoteManifest | null> => {
  const remote = (await import(/* @vite-ignore */ url)) as FederatedRemote;
  if (typeof remote?.get !== "function") {
    return null;
  }

  const factory = await remote.get(MANIFEST_EXPOSE);
  if (typeof factory !== "function") {
    return null;
  }

  return (unwrapDefault(await factory()) as RemoteManifest) ?? null;
};

let discovery: Promise<NextPaymentOverride | null> | null = null;

/**
 * Returns the highest-priority payment override contributed by a plugin other
 * than this one, or `null` when this plugin is the only one overriding it.
 *
 * @param self this plugin's own override component, used to exclude itself by
 *   identity (the manifest holds the very same reference).
 */
export const discoverNextPaymentOverride = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  self: ComponentType<any>
): Promise<NextPaymentOverride | null> => {
  // `window.__CARE_PLUGIN_RUNTIME__.meta` is filled in as each manifest
  // resolves, so an early scan can legitimately come up empty. Only a positive
  // result is worth memoising; a miss stays retryable.
  discovery ??= (async () => {
    const meta = window.__CARE_PLUGIN_RUNTIME__?.meta ?? {};
    const candidates: NextPaymentOverride[] = [];

    await Promise.all(
      Object.entries(meta).map(async ([slug, pluginMeta]) => {
        const url = pluginMeta?.url;
        if (typeof url !== "string" || !url) {
          return;
        }

        try {
          const manifest = await loadRemoteManifest(url);
          for (const override of manifest?.overrides ?? []) {
            if (override?.component !== OVERRIDE_KEY) continue;
            if (!override.replacement) continue;
            if (override.replacement === self) continue;

            candidates.push({
              slug,
              priority: override.priority ?? 0,
              component: override.replacement,
            });
          }
        } catch (error) {
          console.warn(
            `[pinelabs] could not read payment overrides from plugin "${slug}":`,
            error
          );
        }
      })
    );

    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0] ?? null;
  })();

  return discovery.then((result) => {
    if (!result) {
      discovery = null;
    }
    return result;
  });
};
