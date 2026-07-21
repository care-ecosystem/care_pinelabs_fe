import { CreditCard, Link2Icon, QrCode, Smartphone, Info } from "lucide-react";
import { FC, useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShortcutBadge } from "@/components/common/ShortcutBadge";
import { useButtonShortcut } from "@/hooks/useButtonShortcut";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
import { LocationRead } from "@/types/location";
import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationType,
} from "@/types/payment_reconciliation";
import { Account } from "@/types/account";
import { Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Props for PineLabsAccountPayment component
 * ✅ FIXED: account can now be Account object OR account ID string
 */
export type PineLabsAccountPaymentProps = {
  facilityId: string;
  account: Account | string;  // ✅ Accept both object and string
  autoOpen?: boolean;
  isCreditNote?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  showTrigger?: boolean;  // Whether to show the SheetTrigger button
};

// Payment methods available for account payments
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

/**
 * PineLabsAccountPayment Component
 *
 * Handles Pine Labs payment processing for account-level payments.
 * This is used when users click "Advance/Receipt" to pay against an account balance.
 * UI mirrors the invoice payment sheet for consistency.
 *
 * Flow:
 * 1. User selects terminal and location
 * 2. Initiates payment through Pine Labs gateway
 * 3. Polls for payment status
 * 4. Shows success/failure/timeout states
 * 5. Creates payment reconciliation record
 */
export const PineLabsAccountPayment: FC<PineLabsAccountPaymentProps> = ({
  facilityId,
  account: accountProp,
  autoOpen = false,
  isCreditNote = false,
  onClose,
  onSuccess,
  showTrigger = true,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const queryClient = useQueryClient();

  // ✅ NEW: Determine account ID and whether we need to fetch
  const isAccountString = typeof accountProp === "string";
  const accountId = isAccountString ? accountProp : accountProp?.id;

  // ✅ NEW: Fetch account if only ID was provided
  const {
    data: fetchedAccount,
    isLoading: accountLoading,
    error: accountError,
  } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => {
      console.log("[PineLabsAccountPayment] Fetching account:", accountId);
      return apis.accounts.retrieve(facilityId, accountId!);
    },
    enabled: isAccountString && !!accountId,  // Only fetch if it's a string ID
  });

  // ✅ Use fetched account or passed object
  const account = isAccountString ? fetchedAccount : (accountProp as Account);

  // State management
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

  // Calculate amount due from account balance (absolute value)
  // ✅ FIXED: Now safely accesses account object properties
  const amountDue = account ? Math.abs(parseFloat(account.total_balance || "0")) : 0;

  // Debug logging
  useEffect(() => {
    console.log("[PineLabsAccountPayment] State:", {
      accountId,
      isAccountString,
      accountLoading,
      hasAccount: !!account,
      amountDue,
      accountName: account?.name,
    });
  }, [account, accountLoading, amountDue, isAccountString, accountId]);

  // Show loading state while fetching account
  if (!isAccountString && accountLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2Icon className="h-6 w-6 animate-spin" />
            <span>{t("loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if account fetch failed
  if (accountError || (!isAccountString && !account)) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-red-600">
              {t("error_loading_account")}
            </p>
            {accountError && (
              <p className="text-sm text-gray-500">{String(accountError)}</p>
            )}
            <Button onClick={() => onClose?.()} variant="outline">
              {t("back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Return null if account still not available
  if (!account) {
    return null;
  }

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

      // Invalidate queries to refresh account data
      queryClient.invalidateQueries({
        queryKey: ["account", account.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["payments", account.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["payment_reconciliations"],
      });
    },
    [account.id, queryClient, t]
  );

  const handleTimeout = useCallback(() => {
    setPollingTimedOut(true);
    toast.warning(t("toast_transaction_timed_out"));
  }, [t]);

  // Poll for payment status
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

  // Build payment payload for Pine Labs
  const buildUploadPayload = useCallback((): UploadTransactionRequest | null => {
    if (!selectedTerminal) {
        toast.error(t("error_please_select_terminal"));
        return null;
    }

    if (!(amountDue > 0)) {
        toast.error(t("error_tendered_amount_must_be_positive"));
        return null;
    }

    const selectedMethodObj = PAYMENT_METHODS.find(
        (method) => method.value === paymentMethod
    );

    if (!selectedMethodObj) {
        toast.error(t("error_invalid_payment_method"));
        return null;
    }

    // ✅ FIXED: Account payments ALWAYS use "advance"
    // Whether it's a regular payment or credit note, account payments are "advance"
    return {
        terminal: selectedTerminal,
        payment_mode: selectedMethodObj.mode,
        reconciliation_type: PaymentReconciliationType.advance,  // ✅ ALWAYS "advance"
        kind: PaymentReconciliationKind.online,
        issuer_type: PaymentReconciliationIssuerType.patient,
        method: selectedMethodObj.method,
        tendered_amount: amountDue.toFixed(2),
        returned_amount: "0",
        is_credit_note: isCreditNote,
        account: account.id,
        target_invoice: undefined,  // Account payment has no invoice
        location: selectedLocation?.id ?? null,
        disposition: null,
        note: null,
    };
    }, [amountDue, account.id, selectedLocation, selectedTerminal, paymentMethod, t]);

  // Upload transaction to Pine Labs
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

  // Cancel transaction
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
    onSuccess?.();
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent closing during transaction
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

  const isFormStep =
    !showSuccess &&
    !showFailure &&
    !pollingTimedOut &&
    !isTransactionInProgress;

  // Get the payment method label using the unique value
  const currentPaymentMethodLabel = t(`payment_method_${paymentMethod}`);

  // Keyboard shortcuts using custom hook (following care_fe pattern)
  // Shift+Enter: Send payment request
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
      {showTrigger && (
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Link2Icon className="h-4 w-4" />
            {isCreditNote
              ? t("record_credit_note_via_pinelabs")
              : t("receive_payment_via_pinelabs_terminal")}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        className="w-full max-w-md sm:max-w-lg overflow-y-auto pb-0"
        showCloseButton={
          !isTransactionInProgress && !uploadTransactionMutation.isPending
        }
        onEscapeKeyDown={(e) => {
          if (isTransactionInProgress || uploadTransactionMutation.isPending) {
            e.preventDefault();
            toast.warning(t("toast_wait_for_transaction"));
            return;
          }
        }}
        onInteractOutside={(e) => {
          if (isTransactionInProgress || uploadTransactionMutation.isPending) {
            e.preventDefault();
            toast.warning(t("toast_wait_for_transaction"));
            return;
          }
        }}
      >
        <SheetHeader>
          <SheetTitle className="m-0">
            {isCreditNote ? t("record_credit_note") : t("record_payment")}
          </SheetTitle>
          <SheetDescription className="text-gray-700">
            {t("recording_payment_for_account", {
              accountName: account.name,
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
                  amount={amountDue}
                />
              ) : pollingTimedOut ? (
                <TimedOutView
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={amountDue}
                />
              ) : (
                <InProgressView
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={amountDue}
                  isPolling={isPolling}
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Summary - Mirrored from invoice payment sheet */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
                <div className="flex text-sm justify-center text-gray-700">
                  {t("account")}:
                  <p className="font-bold ml-1">{account.name}</p>
                </div>

                <div className="bg-white p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("amount_due")}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(amountDue)}
                  </p>
                </div>

                {/* Decorative divider - Same as invoice sheet */}
                <div
                  className="h-4 w-full bg-repeat-x -mt-4"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10.4' height='12' viewBox='2 3 10.4 9' xmlns='http://www.w3.org/2000/svg'%3E%3Cg filter='url(%23filter0_dd_31940_236060)'%3E%3Cpath d='M7.19629 12L12.3924 3H2.00014L7.19629 12Z' fill='white'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='filter0_dd_31940_236060' x='-0.803711' y='-1' width='16' height='16' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E%3CfeColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3CfeComposite in2='hardAlpha' operator='out'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'/%3E%3CfeBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_31940_236060'/%3E%3CfeColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='0.5'/%3E%3CfeComposite in2='hardAlpha' operator='out'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3CfeBlend mode='normal' in2='effect1_dropShadow_31940_236060' result='effect2_dropShadow_31940_236060'/%3E%3CfeBlend mode='normal' in='SourceGraphic' in2='effect2_dropShadow_31940_236060' result='shape'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E")`,
                    backgroundSize: "10.4px 12px",
                    backgroundPosition: "center",
                  }}
                />
              </div>

              {/* Dynamic Warning with Amount and Payment Method */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2.5">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  {t("payment_warning_message", {
                    amount: formatCurrency(amountDue),
                    paymentMethod: currentPaymentMethodLabel,
                  })}
                </p>
              </div>

              {/* Payment Method Selection - Grid layout like invoice sheet */}
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
                        className="relative flex cursor-pointer flex-col items-center rounded-md border border-gray-400 shadow-sm p-2.5 outline-none has-checked:border-primary-600 has-checked:bg-green-50"
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
                className="gap-2"
                aria-keyshortcuts="Escape"
              >
                {t("cancel")}
                <ShortcutBadge shortcut="ESC" />
              </Button>
              <Button
                variant="primary"
                onClick={handleCollectPayment}
                disabled={!selectedTerminal}
                loading={uploadTransactionMutation.isPending}
                className="flex-1 gap-2"
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

export default PineLabsAccountPayment;