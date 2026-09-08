import type { ComponentType } from "react";
import type {
  ComponentOverrideEntry,
  OverrideCondition,
} from "@/types/care_overrides";

/**
 * Records the overrides other plugins register through Care's bridge.
 *
 * Care accepts a component override two different ways:
 *
 *   1. `manifest.overrides[]`, which `PluginEngine` walks and feeds to
 *      `addOverride`, and
 *   2. `window.__careOverrides.addComponent(key, entry)`, called straight from
 *      the plugin's own module graph while its manifest module evaluates.
 */

export type RecordedOverride<P> = {
  /** Host component key, e.g. `"PaymentReconciliationSheet"`. */
  key: string;
  component: ComponentType<P>;
  priority: number;
  condition?: OverrideCondition;
  /**
   * Script URL the registration came from, read off the call stack. The bridge
   * call carries no plugin slug, so this is the only thing tying a registration
   * back to a plugin — matched against the remoteEntry URLs on
   * `window.__CARE_PLUGIN_RUNTIME__.meta` once that global is populated.
   */
  sourceUrl?: string;
  /** Best-effort component name, for logs when the URL match comes up empty. */
  label: string;
};

/**
 * Everything the spy accumulates, kept in one object so that a plugin built
 * from this same template can adopt it wholesale.
 *
 * `version` moves on every add and every retraction, letting callers tell when
 * a decision they derived from `records` no longer holds.
 */
type SpyState = {
  records: RecordedOverride<never>[];
  version: number;
};

type SpiedAddComponent = ((
  key: string,
  entry: ComponentOverrideEntry
) => () => void) & {
  __pinelabs_spy__?: SpyState;
};

/**
 * Not `const`: when a plugin built from this same template has already
 * installed its own copy of the spy, we adopt its state rather than wrapping a
 * second time. Re-wrapping would be harmless, but bailing out without adopting
 * would leave the later copy recording nothing and unable to chain.
 */
let state: SpyState = { records: [], version: 0 };

const labelFor = (entry: ComponentOverrideEntry) => {
  const component = entry.component as
    | { displayName?: string; name?: string }
    | undefined;
  return component?.displayName || component?.name || "another plugin";
};

/**
 * First script URL on the stack that is not our own, which is the plugin whose
 * module is mid-evaluation. Stack formats differ per engine, but every one of
 * them spells out the URL, so a plain scan is enough — and a miss only costs us
 * a nicer label.
 */
const callerScriptUrl = () => {
  try {
    const frames = new Error().stack?.match(/https?:\/\/[^\s)]+/g) ?? [];
    const own = import.meta.url.split("?")[0];
    return frames.find((frame) => !frame.startsWith(own));
  } catch {
    return undefined;
  }
};

/**
 * Wrap `addComponent` so every registration leaves us a copy. Idempotent, and
 * a no-op against a host that predates the bridge.
 */
export const installOverrideBridgeSpy = () => {
  const bridge = window.__careOverrides;
  if (!bridge) {
    console.warn(
      "[pinelabs] window.__careOverrides is unavailable; overrides other plugins register imperatively cannot be discovered."
    );
    return;
  }

  const original = bridge.addComponent as SpiedAddComponent | undefined;
  if (typeof original !== "function") {
    return;
  }

  if (original.__pinelabs_spy__) {
    state = original.__pinelabs_spy__;
    return;
  }

  const spied = ((key, entry) => {
    const dispose = original.call(bridge, key, entry);
    if (!entry?.component) {
      return dispose;
    }

    const record: RecordedOverride<never> = {
      key,
      component: entry.component,
      priority: entry.priority ?? 0,
      condition: entry.condition,
      sourceUrl: callerScriptUrl(),
      label: labelFor(entry),
    };
    state.records.push(record);
    state.version += 1;

    // Care's registration is disposable — `PluginEngine` drops and re-adds
    // every override when the plugin list changes — so let our copy go with
    // it. Handing off to an override the host no longer knows about would
    // render a component nothing else on the page agrees is in use.
    return () => {
      const index = state.records.indexOf(record);
      if (index !== -1) {
        state.records.splice(index, 1);
        state.version += 1;
      }
      dispose();
    };
  }) as SpiedAddComponent;
  spied.__pinelabs_spy__ = state;

  bridge.addComponent = spied;
};

/** Moves whenever a registration is added or retracted. */
export const recordedVersion = () => state.version;

/**
 * Registrations seen for one host component key, highest priority first.
 *
 * Ties keep insertion order, which is also how Care breaks them: `addOverride`
 * sorts by priority with a stable sort, so the earlier registration stays in
 * front.
 *
 * Props follow from the key rather than from anything the bridge tells us, so
 * the caller names them.
 */
export const recordedOverridesFor = <P>(key: string): RecordedOverride<P>[] =>
  (state.records as unknown as RecordedOverride<P>[])
    .filter((override) => override.key === key)
    .sort((a, b) => b.priority - a.priority);

installOverrideBridgeSpy();
