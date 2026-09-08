import { Component, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { discoverNextPaymentOverride } from "@/lib/nextPaymentOverride";
import type { PaymentReconciliationSheetOverrideProps } from "@/components/overrides/PaymentReconciliationSheetOverride";

/**
 * Renders whatever should take over when the user leaves the Pinelabs flow.
 * `__base` is passed straight through, so the plugin we hand off to can fall
 * through to Care exactly as it would if the host had picked it directly.
 */

type ManualPaymentSheetProps = PaymentReconciliationSheetOverrideProps & {
  /**
   * This plugin's own override component, used to exclude itself when scanning
   * the other manifests. Must be the same reference the manifest holds.
   */
  self: ComponentType<any>;
};

/**
 * Keeps a broken hand-off from taking the sheet down with it.
 *
 * The host wraps us in its own boundary, but that one replaces the whole
 * override with an inline error notice. Falling back to Care's sheet is a far
 * better outcome for someone in the middle of taking a payment.
 */
class HandoffBoundary extends Component<
  { children?: ReactNode; fallback: ReactNode; slug?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[pinelabs] payment override from "${this.props.slug ?? "unknown plugin"}" crashed, falling back to the native sheet:`,
      error
    );
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export const ManualPaymentSheet = ({ self, ...props }: ManualPaymentSheetProps) => {
  const NativeComponent = props.__base;
  const nativeSheet = NativeComponent ? <NativeComponent {...props} /> : null;

  const { data: next, isLoading } = useQuery({
    queryKey: ["pinelabs_next_payment_override"],
    queryFn: () => discoverNextPaymentOverride(self),
    // The result holds live component references, so it must never be cloned.
    // Discovery memoises a hit internally, so re-asking on each open is cheap
    // and lets a plugin that was still loading earlier be picked up later.
    gcTime: Infinity,
    structuralSharing: false,
    retry: false,
  });

  // Discovery re-imports already-cached remote modules, so this is a tick or
  // two at most. Rendering the native sheet first and swapping it out would
  // flash Care's UI in front of the user.
  if (isLoading) {
    return null;
  }

  const NextOverride = next?.component;
  if (!NextOverride) {
    return nativeSheet;
  }

  return (
    <HandoffBoundary fallback={nativeSheet} slug={next.slug}>
      <NextOverride {...props} />
    </HandoffBoundary>
  );
};

export default ManualPaymentSheet;
