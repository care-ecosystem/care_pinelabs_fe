import type { ComponentType } from "react";

/**
 * Shapes borrowed from Care's component-override system.
 *
 * A federated plugin runs in its own module graph and cannot import the host's
 * `@/lib/override`, so anything we need from it has to be re-declared here.
 * These mirror `care_fe/src/lib/override/types.ts` and the bridge surface in
 * `care_fe/src/lib/override/bridge.ts` — keep them in step if the host moves.
 */

/** The live context Care resolves overrides against. */
export interface OverrideContext {
  route?: string;
  page?: string;
  userRole?: string;
  facilityType?: string;
  [key: string]: unknown;
}

/**
 * Scopes an override to a subset of render sites. Care evaluates every clause
 * and renders the highest-priority override whose clauses all pass.
 */
export interface OverrideCondition {
  page?: string | string[];
  userRole?: string | string[];
  facilityType?: string | string[];
  /** Matched against the ancestry of `register()`-wrapped host components. */
  stackPath?: string[];
  custom?: (context: OverrideContext) => boolean;
}

/** A single entry handed to `window.__careOverrides.addComponent`. */
export interface ComponentOverrideEntry<P = never> {
  component: ComponentType<P>;
  description?: string;
  /** Higher wins. Care defaults it to 0. */
  priority?: number;
  condition?: OverrideCondition;
}

/**
 * The surface Care exposes to plugins. Deliberately write-only on the host
 * side: there is no way to read back what has been registered, which is why
 * `overrideBridgeSpy` exists.
 */
export interface CareOverridesBridge {
  addComponent: (key: string, entry: ComponentOverrideEntry) => () => void;
}

declare global {
  interface Window {
    __careOverrides?: CareOverridesBridge;
  }
}
