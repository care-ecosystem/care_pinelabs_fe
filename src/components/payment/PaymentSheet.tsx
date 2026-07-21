import { CreditCard, QrCode, Smartphone } from "lucide-react";
import { FC, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Info } from "lucide-react";

import { apis } from "@/apis";
import { I18NNAMESPACE } from "@/lib/constants";
import { formatCurrency, toast } from "@/lib/utils";
import { getPinelabsErrorMessage } from "@/lib/errors";
import { usePaymentReconciliationStatus } from "@/hooks/usePaymentReconciliationStatus";
import { LocationPicker } from "@/components/payment/LocationPicker";
import { TerminalSelect } from "@/components/payment/TerminalSelect";
import {
  FailureView,
  InProgressView,
  SuccessView,
  TimedOutView,
} from "@/components/payment/PaymentDialog";
import { PaymentMode, UploadTransactionRequest } from "@/types/gateway";
import { Invoice } from "@/types/invoice";
import { Account } from "@/types/account";
import { LocationRead } from "@/types/location";
import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationType,
} from "@/types/payment_reconciliation";
import { PineLabsAccountPayment } from "@/components/payment/PineLabsAccountPayment";
import { ShortcutBadge } from "@/components/common/ShortcutBadge";
import { useButtonShortcut } from "@/hooks/useButtonShortcut";


/**
 * UPDATED: PaymentSheet now accepts either invoice OR account
 */
export type PaymentSheetProps = {
  facilityId: string;
  invoice?: Invoice;
  account?: Account | string;
  autoOpen?: boolean;
  isCreditNote?: boolean;
  onClose?: () => void;
};

const PAYMENT_METHODS = [
  {
    value: "bharat_qr",
    method: PaymentReconciliationPaymentMethod.ddpo,
    mode: PaymentMode.BHARAT_QR,
    icon: QrCode,
  },
  {
    value: "card",
    method: PaymentReconciliationPaymentMethod.debc,
    mode: PaymentMode.CARD,
    icon: CreditCard,
  },
  {
    value: "upi",
    method: PaymentReconciliationPaymentMethod.ddpo,
    mode: PaymentMode.UPI,
    icon: Smartphone,
  },
] as const;

export const PaymentSheet: FC<PaymentSheetProps> = ({
  facilityId,
  invoice,
  account,
  autoOpen = false,
  isCreditNote = false,
  onClose,
}) => {

  if (account) {
    return (
      <PineLabsAccountPayment
        facilityId={facilityId}
        account={account}
        autoOpen={autoOpen}
        isCreditNote={isCreditNote}
        onClose={onClose}
      />
    );
  }

  if (!invoice) {
    console.warn("[PaymentSheet] No invoice or account provided");
    return null;
  }

  const { t } = useTranslation(I18NNAMESPACE);
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    PAYMENT_METHODS[0].value
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationRead | null>(
    null
  );
  const [selectedTerminal, setSelectedTerminal] = useState<string>();
  const [prId, setPrId] = useState<string | null>(null);
  const [settledPr, setSettledPr] = useState<PaymentReconciliation | null>(
    null
  );
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  const amount =
    Number(invoice.total_gross) - parseFloat(invoice.total_payments || "0");

  const handleSettled = useCallback(
    (pr: PaymentReconciliation) => {
      setSettledPr(pr);
      if (pr.outcome === PaymentReconciliationOutcome.complete) {
        toast.success(t("toast_payment_completed_successfully"));
      } else if (pr.outcome === PaymentReconciliationOutcome.error) {
        toast.error(t("toast_payment_failed_on_terminal"));
      } else if (pr.outcome === PaymentReconciliationOutcome.partial) {
        toast.warning(t("toast_payment_partially_completed"));
      }

      queryClient.invalidateQueries({
        queryKey: ["invoice", invoice.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["payment_reconciliations"],
      });
    },
    [invoice.id, queryClient, t]
  );

  const handleTimeout = useCallback(() => {
    setPollingTimedOut(true);
    toast.warning(t("toast_transaction_timed_out"));
  }, [t]);

  const { pr: polledPr, isPolling } = usePaymentReconciliationStatus(prId, {
    enabled: !!prId && !settledPr,
    onSettled: handleSettled,
    onTimeout: handleTimeout,
  });

  const livePr = settledPr ?? polledPr;
  const showSuccess = livePr?.outcome === PaymentReconciliationOutcome.complete;
  const showFailure =
    livePr?.outcome === PaymentReconciliationOutcome.error ||
    livePr?.outcome === PaymentReconciliationOutcome.partial;
  const isTransactionInProgress =
    !!prId && !showSuccess && !showFailure && !pollingTimedOut;

  const resetSheetState = useCallback(() => {
    setPaymentMethod(PAYMENT_METHODS[0].value);
    setSelectedTerminal(undefined);
    setPrId(null);
    setSettledPr(null);
    setPollingTimedOut(false);
  }, []);

  const buildUploadPayload = useCallback((): UploadTransactionRequest | null => {
    if (!selectedTerminal) {
      toast.error(t("error_please_select_terminal"));
      return null;
    }

    if (!(amount > 0)) {
      toast.error(t("error_tendered_amount_must_be_positive"));
      return null;
    }

    const selectedMethodObj = PAYMENT_METHODS.find(
      (m) => m.value === paymentMethod
    );

    if (!selectedMethodObj) {
      toast.error(t("error_invalid_payment_method"));
      return null;
    }

    return {
      terminal: selectedTerminal,
      payment_mode: selectedMethodObj.mode,
      reconciliation_type: PaymentReconciliationType.payment,
      kind: PaymentReconciliationKind.online,
      issuer_type: PaymentReconciliationIssuerType.patient,
      method: selectedMethodObj.method,
      tendered_amount: amount.toFixed(2),
      returned_amount: "0",
      is_credit_note: false,
      account: invoice.account.id,
      target_invoice: invoice.id,
      location: selectedLocation?.id ?? null,
      disposition: null,
      note: null,
    };
  }, [amount, invoice, selectedLocation, selectedTerminal, paymentMethod, t]);

  const uploadTransactionMutation = useMutation({
    mutationFn: apis.gateway.upload_transaction,
    onSuccess: (data) => {
      setPrId(data.id);
      setSettledPr(null);
      setPollingTimedOut(false);
      toast.success(t("toast_collect_payment_on_terminal"));
    },
    onError: (error: unknown) => {
      toast.error(
        getPinelabsErrorMessage(
          error,
          t("error_failed_to_initiate_transaction")
        )
      );
    },
  });

  const cancelTransactionMutation = useMutation({
    mutationFn: apis.gateway.cancel_transaction,
    onSuccess: () => {
      toast.success(t("toast_transaction_cancelled"));
      setIsOpen(false);
      resetSheetState();
      onClose?.();
    },
    onError: (error: unknown) => {
      toast.error(
        getPinelabsErrorMessage(error, t("error_failed_to_cancel_transaction"))
      );
    },
  });

  const handleCollectPayment = () => {
    const payload = buildUploadPayload();
    if (!payload) return;
    uploadTransactionMutation.mutate(payload);
  };

  const handleCancelTransaction = () => {
    if (!prId) return;
    cancelTransactionMutation.mutate({ payment_reconciliation: prId });
  };

  const handleCloseAfterTerminal = () => {
    setIsOpen(false);
    resetSheetState();
    onClose?.();
  };

  const handleOpenChange = (open: boolean) => {
    if (isTransactionInProgress || uploadTransactionMutation.isPending) {
      toast.warning(t("toast_wait_for_transaction"));
      return;
    }
    setIsOpen(open);
    if (!open) {
      resetSheetState();
      onClose?.();
    }
  };


  const currentPaymentMethodLabel = t(`payment_method_${paymentMethod}`);

  const isFormStep =
    !showSuccess &&
    !showFailure &&
    !pollingTimedOut &&
    !isTransactionInProgress;
  useButtonShortcut({
    key: "Enter",
    shiftKey: true,
    enabled: isOpen && isFormStep && !!selectedTerminal && !uploadTransactionMutation.isPending,
    onTrigger: handleCollectPayment,
  });

  // ESC: Cancel/Close
  useButtonShortcut({
    key: "Escape",
    enabled: isOpen && isFormStep,
    onTrigger: () => {
      setIsOpen(false);
      resetSheetState();
      onClose?.();
    },
  });


  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full max-w-md sm:max-w-lg overflow-y-auto pb-0" showCloseButton={!isTransactionInProgress && !uploadTransactionMutation.isPending}>
        <SheetHeader>
          <SheetTitle className="m-0">
            {t("receive_payment_via_pinelabs_terminal")}
          </SheetTitle>
          <SheetDescription className="text-gray-700">
            {t("recording_payment_for_invoice", {
              invoiceNumber: invoice.number
            })}

          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {!isFormStep ? (
            <div className="space-y-6">
              {showSuccess && livePr ? (
                <SuccessView
                  pr={livePr}
                  paymentMethodLabel={currentPaymentMethodLabel}
                />
              ) : showFailure && livePr ? (
                <FailureView
                  pr={livePr}
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={amount}
                />
              ) : pollingTimedOut ? (
                <TimedOutView
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={amount}
                />
              ) : (
                <InProgressView
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={amount}
                  isPolling={isPolling}
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
                <div className="flex text-sm justify-center text-gray-700">
                  {t("invoice_total")}
                  <p className="font-bold ml-1">{formatCurrency(invoice.total_gross)}</p>
                </div>

                <div className="bg-white p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("amount_due")}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(amount)}
                  </p>
                </div>

                <div
                  className="h-4 w-full bg-repeat-x -mt-4"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,...")`,
                    backgroundSize: "10.4px 12px",
                    backgroundPosition: "center",
                  }}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2.5">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  {t("payment_warning_message", {
                    amount: formatCurrency(amount),
                    paymentMethod: currentPaymentMethodLabel,
                  })}
                </p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-gray-950">{t("payment_method")}</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-3 gap-3"  
                >
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Label
                        key={method.value}
                        className="relative flex cursor-pointer flex-col items-center 
                                  rounded-md border border-gray-400 shadow-sm p-2.5 
                                  outline-none has-checked:border-primary-600 has-checked:bg-green-50"
                      >
                        <RadioGroupItem
                          value={method.value}
                          className="absolute left-2 top-2"
                          aria-label={`payment-method-${method.value}`}
                        />
                        <div className="grid grow justify-items-center gap-1">
                          <Icon className="size-5 text-gray-600" />
                          <span className="text-sm font-medium text-center text-gray-950">
                            {t(`payment_method_${method.value}`)}
                          </span>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label className="text-gray-950">{t("location")}</Label>
                <LocationPicker
                  facilityId={facilityId}
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  placeholder={t("select_location")}
                  className="w-full"
                />
              </div>

              {/* Terminal Selection */}
              <div className="space-y-2">
                <Label className="text-gray-950">{t("select_terminal")}</Label>
                <TerminalSelect
                  facilityId={facilityId}
                  value={selectedTerminal}
                  onValueChange={setSelectedTerminal}
                />
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="sticky bottom-0 bg-white p-4 border-t border-gray-200 -mx-6">
          {showSuccess || showFailure || pollingTimedOut ? (
            <Button
              variant="primary"
              onClick={handleCloseAfterTerminal}
              className="w-full"
            >
              {t("close")}
            </Button>
          ) : isTransactionInProgress ? (
            <Button
              variant="outline"
              onClick={handleCancelTransaction}
              loading={cancelTransactionMutation.isPending}
              className="w-full"
            >
              {t("cancel_transaction")}
            </Button>
          ) : (
            <div className="flex justify-between gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  resetSheetState();
                  onClose?.();
                }}
              >
                {t("cancel")}
                <ShortcutBadge shortcut="ESC" />
              </Button>
              <Button
                variant="primary"
                onClick={handleCollectPayment}
                disabled={!selectedTerminal}
                loading={uploadTransactionMutation.isPending}
                aria-keyshortcuts="Shift+Enter"
              >
                {t("send_payment_request")}
                <ShortcutBadge shortcut="⇧ ↵" variant="primary" />
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentSheet;