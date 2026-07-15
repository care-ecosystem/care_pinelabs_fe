import { CreditCard, Link2Icon, QrCode, Smartphone } from "lucide-react";
import { FC, useCallback, useState } from "react";
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
  SheetTrigger,
} from "@/components/ui/sheet";

import { apis } from "@/apis";
import { formatCurrency, toast } from "@/lib/utils";
import { getPinelabsErrorMessage } from "@/lib/errors";
import { usePaymentReconciliationStatus } from "@/hooks/usePaymentReconciliationStatus";
import { LocationSelect } from "@/components/payment/LocationSelect";
import { TerminalSelect } from "@/components/payment/TerminalSelect";
import {
  FailureView,
  InProgressView,
  SuccessView,
  TimedOutView,
} from "@/components/payment/PaymentDialog";
import { PaymentMode, UploadTransactionRequest } from "@/types/gateway";
import { Invoice } from "@/types/invoice";
import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationType,
} from "@/types/payment_reconciliation";

export type PaymentSheetProps = {
  facilityId: string;
  invoice: Invoice;
};

// PaymentReconciliationPaymentMethod has no distinct UPI/Bharat QR values, so
// both reuse "cash" as the method sent to the API and are told apart by
// `mode` (the gateway's payment_mode) instead.
const PAYMENT_METHODS = [
  {
    value: "card",
    method: PaymentReconciliationPaymentMethod.ccca,
    mode: PaymentMode.CARD,
    icon: CreditCard,
    label: "Card",
  },
  {
    value: "upi",
    method: PaymentReconciliationPaymentMethod.cash,
    mode: PaymentMode.UPI,
    icon: Smartphone,
    label: "UPI",
  },
  {
    value: "bharat_qr",
    method: PaymentReconciliationPaymentMethod.cash,
    mode: PaymentMode.BHARAT_QR,
    icon: QrCode,
    label: "Bharat QR",
  },
] as const;

const getPaymentMethodLabel = (paymentMethod: string): string =>
  PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ||
  paymentMethod.toUpperCase();

export const PaymentSheet: FC<PaymentSheetProps> = ({
  facilityId,
  invoice,
}) => {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    PAYMENT_METHODS[0].value,
  );
  const [locationId, setLocationId] = useState<string>();
  const [selectedTerminal, setSelectedTerminal] = useState<string>();
  const [prId, setPrId] = useState<string | null>(null);
  const [settledPr, setSettledPr] = useState<PaymentReconciliation | null>(
    null,
  );
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  // Amount due on this specific invoice — mirrors the native Record Payment
  // sheet's "Amount Due" (PaymentReconciliationSheet.tsx), not the account's
  // aggregate balance, which can span other invoices.
  const amount =
    Number(invoice.total_gross) - parseFloat(invoice.total_payments || "0");

  const handleSettled = useCallback(
    (pr: PaymentReconciliation) => {
      setSettledPr(pr);
      if (pr.outcome === PaymentReconciliationOutcome.complete) {
        toast.success("Payment completed successfully");
      } else if (pr.outcome === PaymentReconciliationOutcome.error) {
        toast.error("Payment failed on the terminal");
      } else if (pr.outcome === PaymentReconciliationOutcome.partial) {
        toast.warning("Payment partially completed on the terminal");
      }
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({
        queryKey: ["payment_reconciliations"],
      });
    },
    [invoice.id, queryClient],
  );

  const handleTimeout = useCallback(() => {
    setPollingTimedOut(true);
    toast.warning(
      "Transaction timed out. Please verify the status on the terminal.",
    );
  }, []);

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
    setSelectedTerminal(undefined);
    setPrId(null);
    setSettledPr(null);
    setPollingTimedOut(false);
  }, []);

  const buildUploadPayload =
    useCallback((): UploadTransactionRequest | null => {
      if (!selectedTerminal) {
        toast.error("Please select a terminal");
        return null;
      }
      if (!(amount > 0)) {
        toast.error("Tendered amount must be greater than zero");
        return null;
      }
      const selectedMethod = PAYMENT_METHODS.find(
        (m) => m.value === paymentMethod,
      );
      if (!selectedMethod) {
        toast.error("Please select a payment method");
        return null;
      }

      return {
        terminal: selectedTerminal,
        payment_mode: selectedMethod.mode,
        reconciliation_type: PaymentReconciliationType.payment,
        kind: PaymentReconciliationKind.online,
        issuer_type: PaymentReconciliationIssuerType.patient,
        method: selectedMethod.method,
        tendered_amount: amount.toFixed(2),
        returned_amount: "0",
        is_credit_note: false,
        account: invoice.account.id,
        target_invoice: invoice.id,
        location: locationId ?? null,
        disposition: null,
        note: null,
      };
    }, [amount, invoice, locationId, paymentMethod, selectedTerminal]);

  const uploadTransactionMutation = useMutation({
    mutationFn: apis.gateway.upload_transaction,
    onSuccess: (data) => {
      setPrId(data.id);
      setSettledPr(null);
      setPollingTimedOut(false);
      toast.success("Collect the payment on the POS terminal");
    },
    onError: (error: unknown) => {
      console.error("Upload Transaction: ", error);
      toast.error(
        getPinelabsErrorMessage(error, "Failed to initiate the transaction"),
      );
    },
  });

  const cancelTransactionMutation = useMutation({
    mutationFn: apis.gateway.cancel_transaction,
    onSuccess: () => {
      toast.success("Transaction cancelled");
      setIsOpen(false);
      resetSheetState();
    },
    onError: (error: unknown) => {
      console.error("Cancel Transaction: ", error);
      toast.error(
        getPinelabsErrorMessage(error, "Failed to cancel the transaction"),
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
  };

  const handleOpenChange = (open: boolean) => {
    // Lock the sheet open mid-transaction — dismissing would orphan a queued
    // PR. Users must wait for the outcome or explicitly Cancel.
    if (isTransactionInProgress) return;
    setIsOpen(open);
    if (!open) resetSheetState();
  };

  const isFormStep =
    !showSuccess &&
    !showFailure &&
    !pollingTimedOut &&
    !isTransactionInProgress;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Link2Icon className="h-4 w-4" />
          Collect via Pinelabs Terminal
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md sm:max-w-lg overflow-y-auto pb-0">
        <SheetHeader>
          <SheetTitle className="m-0">
            Receive Payment via Pinelabs Terminal
          </SheetTitle>
          <SheetDescription className="text-gray-700">
            Recording payment for invoice {invoice.number}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {!isFormStep ? (
            <div className="space-y-6">
              {showSuccess && livePr ? (
                <SuccessView
                  pr={livePr}
                  paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
                />
              ) : showFailure && livePr ? (
                <FailureView
                  pr={livePr}
                  paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
                  amount={amount}
                />
              ) : pollingTimedOut ? (
                <TimedOutView
                  paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
                  amount={amount}
                />
              ) : (
                <InProgressView
                  paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
                  amount={amount}
                  isPolling={isPolling}
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
                <div className="flex text-sm justify-center text-gray-700">
                  Invoice total:
                  <p className="font-bold ml-1">
                    {formatCurrency(invoice.total_gross)}
                  </p>
                </div>

                <div className="bg-white p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(amount)}
                  </p>
                </div>

                <div
                  className="h-4 w-full bg-repeat-x -mt-4"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10.4' height='12' viewBox='2 3 10.4 9' xmlns='http://www.w3.org/2000/svg'%3E%3Cg filter='url(%23filter0_dd_31940_236060)'%3E%3Cpath d='M7.19629 12L12.3924 3H2.00014L7.19629 12Z' fill='white'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='filter0_dd_31940_236060' x='-0.803711' y='-1' width='16' height='16' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E%3CfeColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3CfeComposite in2='hardAlpha' operator='out'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'/%3E%3CfeBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_31940_236060'/%3E%3CfeColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='0.5'/%3E%3CfeComposite in2='hardAlpha' operator='out'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3CfeBlend mode='normal' in2='effect1_dropShadow_31940_236060' result='effect2_dropShadow_31940_236060'/%3E%3CfeBlend mode='normal' in='SourceGraphic' in2='effect2_dropShadow_31940_236060' result='shape'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E")`,
                    backgroundSize: "10.4px 12px",
                    backgroundPosition: "center",
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-950">Payment Method</Label>
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
                            {method.label}
                          </span>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-950">Location</Label>
                <LocationSelect
                  facilityId={facilityId}
                  value={locationId}
                  onValueChange={setLocationId}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-950">Select Terminal</Label>
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
              Close
            </Button>
          ) : isTransactionInProgress ? (
            <Button
              variant="outline"
              onClick={handleCancelTransaction}
              loading={cancelTransactionMutation.isPending}
              className="w-full"
            >
              Cancel Transaction
            </Button>
          ) : (
            <div className="flex justify-between gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCollectPayment}
                disabled={!selectedTerminal}
                loading={uploadTransactionMutation.isPending}
                className="flex-1"
              >
                Collect Payment
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
