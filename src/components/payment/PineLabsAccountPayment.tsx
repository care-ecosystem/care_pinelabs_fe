import { Info, ArrowUpLeft, Loader2Icon } from "lucide-react";
import { FC, useCallback, useMemo, useState, useEffect } from "react";
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
} from "@/components/ui/sheet";

import { apis } from "@/apis";
import { I18NNAMESPACE } from "@/lib/constants";
import { formatCurrency, toast } from "@/lib/utils";
import { getPinelabsErrorMessage } from "@/lib/errors";
import {
  PINELABS_PAYMENT_MODE_ICONS,
  PINELABS_PAYMENT_MODES,
} from "@/lib/paymentMethods";
import { usePaymentReconciliationStatus } from "@/hooks/usePaymentReconciliationStatus";
import { LocationPicker } from "@/components/payment/LocationPicker";
import { TerminalSelect } from "@/components/payment/TerminalSelect";
import {
  FailureView,
  InProgressView,
  SuccessView,
  TimedOutView,
} from "@/components/payment/PaymentDialog";
import { UploadTransactionRequest } from "@/types/gateway";
import { LocationRead } from "@/types/location";
import { Device } from "@/types/device";
import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationStatus,
  PaymentReconciliationType,
} from "@/types/payment_reconciliation";
import { Account } from "@/types/account";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getStoredTerminalSelection,
  setStoredTerminalSelection,
} from "@/lib/terminalSession";


export type PineLabsAccountPaymentProps = {
  facilityId: string;
  account: Account | string;
  autoOpen?: boolean;
  isCreditNote?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onSwitchToManual?: () => void;
};

export const PineLabsAccountPayment: FC<PineLabsAccountPaymentProps> = ({
  facilityId,
  account: accountProp,
  autoOpen = false,
  isCreditNote = false,
  onClose,
  onSuccess,
  onSwitchToManual,
}) => {

  const { t } = useTranslation(I18NNAMESPACE);
  const queryClient = useQueryClient();

  const isAccountString = typeof accountProp === "string";
  const accountId = isAccountString ? accountProp : accountProp?.id;

  const {
    data: fetchedAccount,
    isLoading: accountLoading,
    error: accountError,
  } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => {
      return apis.accounts.retrieve(facilityId, accountId!);
    },
    enabled: isAccountString && !!accountId,
  });

  const account = isAccountString ? fetchedAccount : (accountProp as Account);

  /**
   * Fetch Pinelabs config with payment method mappings
   */
  const {
    data: pinelabsConfig,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ["pinelabs_config", facilityId],
    queryFn: () => apis.pinelabs_config.get(facilityId),
    enabled: !!facilityId,
    retry: 2,});

  // State management
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<LocationRead | null>(
    null
  );
  const [selectedTerminal, setSelectedTerminal] = useState<string>();
  const [prId, setPrId] = useState<string | null>(null);
  const [settledPr, setSettledPr] = useState<PaymentReconciliation | null>(
    null
  );
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  useEffect(() => {
    if (pinelabsConfig?.payment_method_mappings && pinelabsConfig.payment_method_mappings.length > 0) {
      // Find the default payment method
      const defaultMethod = pinelabsConfig.payment_method_mappings.find(
        (m) => m.is_default === true
      );

      if (defaultMethod) {
        setPaymentMethod(defaultMethod.pinelabs_method);
      } else if (pinelabsConfig.payment_method_mappings.length > 0) {
        setPaymentMethod(pinelabsConfig.payment_method_mappings[0].pinelabs_method);
      }
    }
  }, [pinelabsConfig?.payment_method_mappings]);
  useEffect(() => {
    if (!isOpen || !facilityId || selectedTerminal) return;
    const stored = getStoredTerminalSelection(facilityId);
    if (stored) {
      setSelectedTerminal(stored.terminalId);
      setSelectedLocation(stored.location);
    }
  }, [isOpen, facilityId, selectedTerminal]);

  useEffect(() => {
    if (
      isOpen &&
      !configLoading &&
      !configError &&
      pinelabsConfig &&
      pinelabsConfig.payment_method_mappings.length === 0
    ) {
      toast.error(t("no_payment_methods_configured"), {
        id: "pinelabs-no-payment-methods",
      });
    }
  }, [isOpen, configLoading, configError, pinelabsConfig, t]);

  const amountDue = account ? parseFloat(account.total_balance || "0") : 0;
  const displayAmount = parseFloat(tenderedAmount) || 0;

  const handleTenderedAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === "") {
      setTenderedAmount(value);
    }
  };

  const handleDeviceSelected = useCallback((device: Device) => {
    if (device.current_location) {
      const locationAsRead = device.current_location as unknown as LocationRead;
      setSelectedLocation(locationAsRead);
    } else {
      setSelectedLocation(null);
    }
  }, []);

  // Define all callbacks and hooks before any conditional returns
  const handleSettled = useCallback(
    (pr: PaymentReconciliation) => {
      if (!account) return;
      setSettledPr(pr);
      if (pr.outcome === PaymentReconciliationStatus.complete) {
        toast.success(t("toast_payment_completed_successfully"));
      } else if (pr.outcome === PaymentReconciliationStatus.error) {
        toast.error(t("toast_payment_failed_on_terminal"));
      } else if (pr.outcome === PaymentReconciliationStatus.partial) {
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
    [account?.id, queryClient, t]
  );

  const handleTimeout = useCallback(() => {
    setPollingTimedOut(true);
    toast.warning(t("toast_transaction_timed_out"));
  }, [t]);

  // Poll for payment status
  const { pr: polledPr, isPolling } = usePaymentReconciliationStatus(prId, {
    enabled: !!prId && !settledPr && !!account,
    onSettled: handleSettled,
    onTimeout: handleTimeout,
  });

  const livePr = settledPr ?? polledPr;
  const transactionNumber = (livePr?.meta?.pinelabs?.transaction_number as string | null) ?? undefined;
  const transactionReferenceId = (livePr?.meta?.pinelabs?.transaction_reference_id as string | null) ?? undefined;
  const showSuccess = livePr?.outcome === PaymentReconciliationStatus.complete;
  const showFailure =
    livePr?.outcome === PaymentReconciliationStatus.error ||
    livePr?.outcome === PaymentReconciliationStatus.partial;
  const isTransactionInProgress =
    !!prId && !showSuccess && !showFailure && !pollingTimedOut;

  const resetSheetState = useCallback(() => {
    setPaymentMethod("");
    setSelectedTerminal(undefined);
    setSelectedLocation(null);
    setTenderedAmount("");
    setPrId(null);
    setSettledPr(null);
    setPollingTimedOut(false);
  }, []);

  // Build payment payload for Pine Labs
  const buildUploadPayload = useCallback((): UploadTransactionRequest | null => {
    if (!account) {
      toast.error(t("error_account_not_found"));
      return null;
    }

    if (!selectedTerminal) {
      toast.error(t("error_please_select_terminal"));
      return null;
    }

    if (!selectedLocation) {
      toast.error(t("error_please_select_location"));
      return null;
    }

    const amount = parseFloat(tenderedAmount);

    if (!(amount > 0)) {
      toast.error(t("error_tendered_amount_must_be_positive"));
      return null;
    }

    if (!paymentMethod) {
      toast.error(t("error_invalid_payment_method"));
      return null;
    }

    const selectedMethodMapping = pinelabsConfig?.payment_method_mappings.find(
      (m) => m.pinelabs_method === paymentMethod
    );

    if (!selectedMethodMapping) {
      toast.error(t("error_invalid_payment_method"));
      return null;
    }

    return {
      terminal: selectedTerminal,
      payment_mode: paymentMethod, 
      reconciliation_type: PaymentReconciliationType.advance,
      kind: PaymentReconciliationKind.online,
      issuer_type: PaymentReconciliationIssuerType.patient,
      method: selectedMethodMapping.care_method,
      tendered_amount: amount.toFixed(2),
      returned_amount: "0",
      is_credit_note: isCreditNote,
      account: account.id,
      target_invoice: undefined,
      location: selectedLocation.id,
      disposition: null,
      note: null,
    };
  }, [tenderedAmount, account?.id, selectedLocation, selectedTerminal, paymentMethod, pinelabsConfig?.payment_method_mappings, isCreditNote, t]);

  // Upload transaction to Pine Labs
  const uploadTransactionMutation = useMutation({
    mutationFn: apis.gateway.upload_transaction,
    onSuccess: (data) => {
      setPrId(data.id);
      setSettledPr(null);
      setPollingTimedOut(false);
      toast.success(t("toast_collect_payment_on_terminal"));
      if (selectedTerminal) {
        setStoredTerminalSelection(facilityId, {
          terminalId: selectedTerminal,
          location: selectedLocation,
        });
      }
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
    onClose?.();
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

  const getPaymentMethodLabel = (pinelabsMethod: string) => {
    const mode = PINELABS_PAYMENT_MODES.find((m) => m.value === pinelabsMethod);
    return mode ? t(mode.labelKey) : pinelabsMethod;
  };

  const currentPaymentMethodLabel = getPaymentMethodLabel(paymentMethod);

  const configuredPinelabsMethods = useMemo(() => {
    const configuredValues = new Set(
      (pinelabsConfig?.payment_method_mappings ?? []).map(
        (m) => m.pinelabs_method
      )
    );
    return PINELABS_PAYMENT_MODES.filter((mode) =>
      configuredValues.has(mode.value)
    );
  }, [pinelabsConfig?.payment_method_mappings]);

  // Keyboard shortcuts using custom hook (following care_fe pattern)
  // Shift+Enter: Send payment request
  useButtonShortcut({
    key: "Enter",
    shiftKey: true,
    enabled: isOpen && isFormStep && !!selectedTerminal && !!selectedLocation && !!tenderedAmount && !uploadTransactionMutation.isPending,
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

  // Show loading state while fetching account
  if (isAccountString && accountLoading) {
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
  if (accountError || (isAccountString && !account)) {
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

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
            {t("receive_payment_via_pinelabs_terminal")}
          </SheetTitle>
          <SheetDescription className="text-gray-700">
            {t("recording_payment_for_account")}
          </SheetDescription>
        </SheetHeader>
        {isFormStep && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                onSwitchToManual?.();
              }}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              <ArrowUpLeft className="h-4 w-4" />
              {t("switch_to_manual_entry")}
            </button>
          </div>
        )}

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
                  amount={displayAmount}
                />
              ) : pollingTimedOut ? (
                <TimedOutView
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={displayAmount}
                />
              ) : (
                <InProgressView
                  paymentMethodLabel={currentPaymentMethodLabel}
                  amount={displayAmount}
                  isPolling={isPolling}
                  transactionNumber={transactionNumber}
                  transactionReferenceId={transactionReferenceId}
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
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
                    amount: formatCurrency(parseFloat(tenderedAmount) || 0),
                    paymentMethod: currentPaymentMethodLabel,
                  })}
                </p>
              </div>

              {/* Payment Method - DYNAMIC from Pinelabs Config */}
              <div className="space-y-2">
                <Label className="text-gray-950">{t("payment_method")}</Label>
                {configLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4 border rounded bg-blue-50">
                    <Loader2Icon className="size-4 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-600">{t("loading")}</p>
                  </div>
                ) : configError ? (
                  <div className="text-sm text-red-600 py-4 border border-red-200 rounded px-3 bg-red-50">
                    {t("failed_to_load_payment_methods")}
                  </div>
                ) : configuredPinelabsMethods.length > 0 ? (
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-3 gap-3"
                  >
                    {configuredPinelabsMethods.map((mode) => {
                      const Icon = PINELABS_PAYMENT_MODE_ICONS[mode.value];
                      const isDefault = pinelabsConfig?.payment_method_mappings.some(
                        (m) => m.pinelabs_method === mode.value && m.is_default
                      );

                      return (
                        <Label
                          key={mode.value}
                          className="relative flex cursor-pointer flex-col items-center rounded-md border border-gray-400 shadow-sm p-2.5 outline-none has-checked:border-primary-600 has-checked:bg-green-50"
                        >
                          <RadioGroupItem
                            value={mode.value}
                            className="absolute left-2 top-2"
                            aria-label={`payment-method-${mode.value}`}
                          />
                          <div className="grid grow justify-items-center gap-1">
                            <Icon className="size-5 text-gray-600" />
                            <span className="text-sm font-medium text-center text-gray-950">
                              {t(mode.labelKey)}
                            </span>
                            {isDefault && (
                              <span className="text-xs text-green-600 font-semibold">
                                {t("default")}
                              </span>
                            )}
                          </div>
                        </Label>
                      );
                    })}
                  </RadioGroup>
                ) : (
                  <div className="text-sm text-gray-500 py-4 border rounded bg-gray-50 text-center">
                    {t("no_payment_methods_configured")}
                  </div>
                )}
              </div>

              {/* Advance Amount Input */}
              <div className="space-y-2">
                <Label className="text-gray-950">
                  {t("advance_amount")}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                    ₹
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={tenderedAmount}
                    onChange={handleTenderedAmountChange}
                    className="w-full pl-8"
                  />
                </div>
                {tenderedAmount && (
                  <p className="text-xs text-gray-500">
                    {t("amount")}: {formatCurrency(parseFloat(tenderedAmount) || 0)}
                  </p>
                )}
              </div>

              {/* Terminal Selection */}
              <div className="space-y-2">
                <Label className="text-gray-950">{t("select_terminal")}</Label>
                <TerminalSelect
                  facilityId={facilityId}
                  value={selectedTerminal}
                  onValueChange={setSelectedTerminal}
                  onDeviceSelected={handleDeviceSelected}
                />
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
                disabled={!selectedTerminal || !selectedLocation || !tenderedAmount || uploadTransactionMutation.isPending}
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

export default PineLabsAccountPayment;