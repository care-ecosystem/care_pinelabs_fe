import { useEffect, useState } from "react";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { PineLabsAccountPayment } from "@/components/payment/PineLabsAccountPayment";
import { Invoice } from "@/types/invoice";
import { Account } from "@/types/account";

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

const PaymentReconciliationSheetOverride = (props: PaymentReconciliationSheetOverrideProps) => {

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
      const url = new URL(window.location.href);
      if (url.searchParams.has("mode")) {
        url.searchParams.delete("mode");
        window.history.replaceState({}, "", url.toString());
        setUrlMode(null);
      }
    }
  }, [props.open, isInitialized]);

  try {
    if (!props.open) {
      return null;
    }

    const setUrlParam = (paramName: string, paramValue: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, paramValue);
      window.history.replaceState({}, "", url.toString());
      setUrlMode(paramValue);
    };

    const removeUrlParam = (paramName: string) => {
      const url = new URL(window.location.href);
      url.searchParams.delete(paramName);
      window.history.replaceState({}, "", url.toString());
      setUrlMode(null);
    };

    if (urlMode === "manual" && props.__base) {
      const NativeComponent = props.__base;

      return (
        <NativeComponent
          {...props}
          onOpenChange={(open: boolean) => {
            if (!open) {
              removeUrlParam("mode");
            }
            props.onOpenChange(open);
          }}
        />
      );
    }
    if (props.isCreditNote && props.__base) {
      const NativeComponent = props.__base;

      return (
        <NativeComponent
          {...props}
          onOpenChange={(open: boolean) => {
            if (!open) {
              removeUrlParam("mode");
            }
            props.onOpenChange(open);
          }}
        />
      );
    }

    if (props.invoice) {
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
          onSwitchToManual={() => {
            setUrlParam("mode", "manual");
          }}
          onClose={() => {
            removeUrlParam("mode");
            props.onOpenChange(false);
          }}
        />
      );
    }

    if (props.account || props.accountId) {
      if (!urlMode && isInitialized) {
        setUrlParam("mode", "pinelabs");
      }

      return (
        <PineLabsAccountPayment
          facilityId={props.facilityId}
          account={props.account ?? props.accountId}
          autoOpen={true}
          isCreditNote={props.isCreditNote}
          onSwitchToManual={() => {
            setUrlParam("mode", "manual");
          }}
          onClose={() => {
            removeUrlParam("mode");
            props.onOpenChange(false);
          }}
        />
      );
    }

    return null;
  } catch (error) {
    console.error("[Override] ERROR:", error);
    return null;
  }
};

export default PaymentReconciliationSheetOverride;