import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { PineLabsAccountPayment } from "@/components/payment/PineLabsAccountPayment";
import { useState } from "react";

interface PaymentReconciliationSheetOverrideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  invoice?: any;
  account?: any;
  accountId: string;
  isCreditNote?: boolean;
  __base?: any;
}

const PaymentReconciliationSheetOverride = (props: PaymentReconciliationSheetOverrideProps) => {
  useTranslation(I18NNAMESPACE);
  const [showNative, setShowNative] = useState(false);

  const updateUrlParam = (paramName: string, paramValue: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, paramValue);
    window.history.replaceState({}, "", url.toString());
  };

  const removeUrlParam = (paramName: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete(paramName);
    window.history.replaceState({}, "", url.toString());
  };

  if (!props.open) {
    return null;
  }

  if (showNative && props.__base) {
    updateUrlParam("mode", "manual");

    const NativeComponent = props.__base;

    const { __base, ...nativeProps } = props;

    const wrappedProps = {
      ...nativeProps,
      onOpenChange: (open: boolean) => {
        if (!open) {
          setShowNative(false);
        }
        nativeProps.onOpenChange(open);
      }
    };

    return <NativeComponent {...wrappedProps} />;
  }

  if (props.invoice) {
    updateUrlParam("mode", "pinelabs");
    return (
      <PaymentSheet
        facilityId={props.facilityId}
        invoice={props.invoice}
        account={props.account}
        autoOpen={true}
        isCreditNote={props.isCreditNote}
        onSwitchToManual={() => {
          setShowNative(true);
        }}
        onClose={() => {
          removeUrlParam("mode");
          props.onOpenChange(false);
        }}
      />
    );
  }

  if (props.account) {
    updateUrlParam("mode", "pinelabs");
    return (
      <PineLabsAccountPayment
        facilityId={props.facilityId}
        account={props.account}
        autoOpen={true}
        isCreditNote={props.isCreditNote}
        onSwitchToManual={() => {
          setShowNative(true);
        }}
        onClose={() => {
          removeUrlParam("mode");
          props.onOpenChange(false);
        }}
      />
    );
  }

  return null;
};

export default PaymentReconciliationSheetOverride;