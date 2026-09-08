import type {
  OverrideCondition,
  OverrideContext,
} from "@/types/care_overrides";

/**
 * Local evaluation of an override's condition.
 * Mirrors `matchCondition` in `care_fe/src/lib/override/registry.ts` and
 * `extractPageFromRoute` in `care_fe/src/lib/override/OverrideProvider.tsx`.
 */

const matchValue = (
  value: string | undefined,
  condition: string | string[] | undefined
) => {
  if (!condition) return true;
  if (!value) return false;
  return Array.isArray(condition)
    ? condition.includes(value)
    : value === condition;
};

/** Mirrors the host's `extractPageFromRoute`. */
const pageFromRoute = (route: string) => {
  const segments = route.split("/").filter(Boolean);
  if (!segments.length) return "home";

  const [first, second, third] = segments;
  if (second !== undefined && /^[0-9a-f-]+$/i.test(second) && third) {
    return `${first}-${third}`;
  }
  return first;
};

/** The slice of the host's override context we can rebuild from the URL. */
export const localOverrideContext = (): OverrideContext => {
  const route = window.location.pathname || "/";
  return { route, page: pageFromRoute(route) };
};

export const matchesOverrideCondition = (
  condition: OverrideCondition | undefined,
  label: string
): boolean => {
  if (!condition) return true;

  if (
    condition.userRole ||
    condition.facilityType ||
    condition.stackPath?.length
  ) {
    console.warn(
      `[pinelabs] not handing the payment sheet to "${label}": its override is scoped by host state a plugin cannot read.`
    );
    return false;
  }

  const context = localOverrideContext();
  if (!matchValue(context.page, condition.page)) {
    return false;
  }

  try {
    return condition.custom ? condition.custom(context) : true;
  } catch (error) {
    console.warn(
      `[pinelabs] the payment override from "${label}" has a custom condition that threw; skipping it:`,
      error
    );
    return false;
  }
};
