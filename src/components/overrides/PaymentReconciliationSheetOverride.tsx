import { useEffect, useState } from "react";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { PineLabsAccountPayment } from "@/components/payment/PineLabsAccountPayment";
import { SwitchToPinelabsButton } from "@/components/overrides/SwitchToPinelabsButton";
import { Invoice } from "@/types/invoice";
import { Account } from "@/types/account";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";

export interface PaymentReconciliationSheetOverrideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  invoice?: Invoice;
  account?: Account | string;
  accountId: string;
  isCreditNote?: boolean;
  __base?: React.ComponentType<PaymentReconciliationSheetOverrideProps>;
}

const cleanupUrlParams = () => {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("mode")) {
      url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.toString());
      return true;
    }
  } catch (error) {
    console.error("Error cleaning URL:", error);
  }
  return false;
};

const PaymentReconciliationSheetOverride = (props: PaymentReconciliationSheetOverrideProps) => {
  const { data: pinelabsConfig, isLoading: isPinelabsConfigLoading } =
    useQuery({
      queryKey: ["pinelabs_config", props.facilityId],
      queryFn: () => apis.pinelabs_config.get(props.facilityId),
      enabled: !!props.facilityId && props.open,
    });

  const allowAdvancePayment = pinelabsConfig?.allow_advance_payment;
  const allowManualEntry = pinelabsConfig?.meta?.allow_manual_entry;
  const isPinelabsFlow = pinelabsConfig?.default_payment_flow === "pinelabs";

  const [urlMode, setUrlMode] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      setUrlMode(mode);
      setIsInitialized(true);
    };

    updateMode();
    window.addEventListener("popstate", updateMode);

    return () => {
      window.removeEventListener("popstate", updateMode);
    };
  }, []);

  useEffect(() => {
    if (!props.open && isInitialized) {
      const cleanupTimer = setTimeout(() => {
        cleanupUrlParams();
        setUrlMode(null);
      }, 100);

      return () => clearTimeout(cleanupTimer);
    }
  }, [props.open, isInitialized]);
  useEffect(() => {
    return () => {
      cleanupUrlParams();
    };
  }, []);

  try {
    if (!props.open) {
      return null;
    }
    if (isPinelabsConfigLoading && !!props.facilityId) {
      return null;
    }

    const setUrlParam = (paramName: string, paramValue: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, paramValue);
      window.history.replaceState({}, "", url.toString());
      setUrlMode(paramValue);
    };

    const removeUrlParam = () => {
      cleanupUrlParams();
      setUrlMode(null);
    };

    const canSwitchToPinelabs = props.isCreditNote
      ? false
      : props.invoice
        ? !!pinelabsConfig
        : !!(props.account || props.accountId) &&
          !!pinelabsConfig &&
          allowAdvancePayment;

    if (urlMode === "manual" && props.__base) {
      const NativeComponent = props.__base;

      return (
        <>
          <NativeComponent
            {...props}
            onOpenChange={(open: boolean) => {
              if (!open) {
                removeUrlParam();
                props.onOpenChange(false);
              } else {
                props.onOpenChange(open);
              }
            }}
          />
          {canSwitchToPinelabs && (
            <SwitchToPinelabsButton
              matchText={props.invoice?.number}
              onSwitchToPinelabs={() => setUrlParam("mode", "pinelabs")}
            />
          )}
        </>
      );
    }

    if (props.isCreditNote && props.__base) {
      const NativeComponent = props.__base;

      return (
        <NativeComponent
          {...props}
          onOpenChange={(open: boolean) => {
            if (!open) {
              removeUrlParam();
              props.onOpenChange(false);
            } else {
              props.onOpenChange(open);
            }
          }}
        />
      );
    }

    if (props.invoice) {
      if (isPinelabsFlow || urlMode === "pinelabs") {
        if (!urlMode && isInitialized) {
          setUrlParam("mode", "pinelabs");
        }

        return (
          <PaymentSheet
            facilityId={props.facilityId}
            invoice={props.invoice}
            account={undefined}
            autoOpen={true}
            isCreditNote={props.isCreditNote}
            onSwitchToManual={
              allowManualEntry
                ? () => {
                    setUrlParam("mode", "manual");
                  }
                : undefined
            }
            onClose={() => {
              props.onOpenChange(false);
              removeUrlParam();
            }}
          />
        );
      }

      if (props.__base) {
        if (!urlMode && isInitialized) {
          setUrlParam("mode", "manual");
        }

        const NativeComponent = props.__base;
        return (
          <>
            <NativeComponent
              {...props}
              onOpenChange={(open: boolean) => {
                if (!open) {
                  removeUrlParam();
                  props.onOpenChange(false);
                } else {
                  props.onOpenChange(open);
                }
              }}
            />
            {canSwitchToPinelabs && (
              <SwitchToPinelabsButton
                matchText={props.invoice.number}
                onSwitchToPinelabs={() => setUrlParam("mode", "pinelabs")}
              />
            )}
          </>
        );
      }
    }

    if (props.account || props.accountId) {
      if ((isPinelabsFlow || urlMode === "pinelabs") && allowAdvancePayment) {
        if (!urlMode && isInitialized) {
          setUrlParam("mode", "pinelabs");
        }
        return (
          <PineLabsAccountPayment
            facilityId={props.facilityId}
            account={props.account ?? props.accountId}
            autoOpen={true}
            isCreditNote={props.isCreditNote}
            onSwitchToManual={
              allowManualEntry
                ? () => {
                    setUrlParam("mode", "manual");
                  }
                : undefined
            }
            onClose={() => {
              props.onOpenChange(false);
              removeUrlParam();
            }}
          />
        );
      }

      if (props.__base) {
        if (!urlMode && isInitialized) {
          setUrlParam("mode", "manual");
        }

        const NativeComponent = props.__base;
        return (
          <>
            <NativeComponent
              {...props}
              onOpenChange={(open: boolean) => {
                if (!open) {
                  removeUrlParam();
                  props.onOpenChange(false);
                } else {
                  props.onOpenChange(open);
                }
              }}
            />
            {canSwitchToPinelabs && (
              <SwitchToPinelabsButton
                onSwitchToPinelabs={() => setUrlParam("mode", "pinelabs")}
              />
            )}
          </>
        );
      }
    }

    return null;
  } catch (error) {
    console.error("[PaymentReconciliationSheetOverride] Failed to render:", error);
    return null;
  }
};

export default PaymentReconciliationSheetOverride;
