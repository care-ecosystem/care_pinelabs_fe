import type { ComponentType } from "react";
import {
  recordedOverridesFor,
  recordedVersion,
} from "@/lib/overrideBridgeSpy";
import { matchesOverrideCondition } from "@/lib/overrideConditions";
import type { OverrideCondition } from "@/types/care_overrides";
import type { PaymentReconciliationSheetOverrideProps } from "@/components/overrides/PaymentReconciliationSheetOverride";

const OVERRIDE_KEY = "PaymentReconciliationSheet";
const MANIFEST_EXPOSE = "./manifest";

type PaymentSheetComponent = ComponentType<PaymentReconciliationSheetOverrideProps>;

type FederatedRemote = {
  get?: (module: string) => Promise<() => unknown>;
};

type RemoteOverride = {
  component?: string;
  replacement?: PaymentSheetComponent;
  priority?: number;
  condition?: OverrideCondition;
};

type RemoteManifest = {
  overrides?: readonly RemoteOverride[];
};

export type NextPaymentOverride = {
  slug: string;
  priority: number;
  component: PaymentSheetComponent;
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

/**
 * Which plugin a bridge registration came from, matched on the origin of the
 * script that made the call. Only resolvable once `PluginEngine` has published
 * its meta, which happens well after the registration itself — hence doing it
 * here rather than in the spy.
 */
const slugForSource = (sourceUrl?: string): string | null => {
  if (!sourceUrl) return null;

  let origin: string;
  try {
    origin = new URL(sourceUrl).origin;
  } catch {
    return null;
  }

  const meta = window.__CARE_PLUGIN_RUNTIME__?.meta ?? {};
  for (const [slug, pluginMeta] of Object.entries(meta)) {
    const url = pluginMeta?.url;
    if (typeof url !== "string" || !url) continue;
    try {
      if (new URL(url).origin === origin) return slug;
    } catch {
      // Not a URL we can compare; try the next plugin.
    }
  }
  return null;
};

/** Keeps the hand-off marker readable if it ever lands in the URL. */
const slugify = (label: string) =>
  label.replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase() || "plugin";

/** Overrides registered imperatively, captured by `overrideBridgeSpy`. */
const bridgeCandidates = (
  self: PaymentSheetComponent
): NextPaymentOverride[] =>
  recordedOverridesFor<PaymentReconciliationSheetOverrideProps>(OVERRIDE_KEY)
    .filter((override) => override.component !== self)
    .filter((override) =>
      matchesOverrideCondition(override.condition, override.label)
    )
    .map((override) => ({
      slug: slugForSource(override.sourceUrl) ?? slugify(override.label),
      priority: override.priority,
      component: override.component,
    }));

/** Overrides declared the documented way, in a plugin's own manifest. */
const manifestCandidates = async (
  self: PaymentSheetComponent
): Promise<NextPaymentOverride[]> => {
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
          if (!matchesOverrideCondition(override.condition, slug)) continue;

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

  return candidates;
};

let discovery: Promise<NextPaymentOverride | null> | null = null;
let discoveredAtVersion = -1;

/**
 * Returns the highest-priority payment override contributed by a plugin other
 * than this one, or `null` when this plugin is the only one overriding it.
 *
 * @param self this plugin's own override component, used to exclude itself by
 *   identity (the manifest holds the very same reference).
 */
export const discoverNextPaymentOverride = (
  self: PaymentSheetComponent
): Promise<NextPaymentOverride | null> => {
  // A memoised hit goes stale the moment the host retracts the override behind
  // it — `PluginEngine` disposes and re-adds every plugin's overrides whenever
  // the plugin list changes, and a disabled plugin never comes back. Handing
  // off to a component the host has dropped would render a sheet nothing else
  // on the page agrees is in use.
  if (discovery && discoveredAtVersion !== recordedVersion()) {
    discovery = null;
  }

  // `window.__CARE_PLUGIN_RUNTIME__.meta` is filled in as each manifest
  // resolves, so an early scan can legitimately come up empty. Only a positive
  // result is worth memoising; a miss stays retryable.
  if (!discovery) {
    discoveredAtVersion = recordedVersion();
    discovery = (async () => {
      // Bridge registrations go first so ties break the way Care breaks them:
      // they all land during manifest evaluation, ahead of the effect in
      // `PluginEngine` that registers the manifest-declared ones, and
      // `addOverride` sorts by priority with a stable sort.
      const candidates = [
        ...bridgeCandidates(self),
        ...(await manifestCandidates(self)),
      ];

      candidates.sort((a, b) => b.priority - a.priority);

      if (!candidates.length) {
        console.warn(
          `[pinelabs] no other plugin contributes a "${OVERRIDE_KEY}" override; falling back to Care's native payment sheet.`
        );
      }

      return candidates[0] ?? null;
    })();
  }

  return discovery.then((result) => {
    if (!result) {
      discovery = null;
    }
    return result;
  });
};
