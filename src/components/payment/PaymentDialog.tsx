import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  Link2Icon,
  Loader2Icon,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FC, useCallback, useMemo, useState } from "react";
import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationType,
} from "@/types/payment_reconciliation";
import {
  PaymentMode,
  UploadTransactionRequest,
} from "@/types/gateway";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, toast } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Invoice } from "@/types/invoice";
import { Label } from "@/components/ui/label";
import { TerminalSelect } from "./TerminalSelect";
import { UseFormReturn } from "react-hook-form";
import { apis } from "@/apis";
import { getPinelabsErrorMessage } from "@/lib/errors";
import { usePaymentReconciliationStatus } from "@/hooks/usePaymentReconciliationStatus";

export type PaymentDialogProps = {
  facilityId: string;
  invoice?: Invoice;
  form: UseFormReturn;
};

const SUPPORTED_METHODS = new Set([
  PaymentReconciliationPaymentMethod.debc,
  PaymentReconciliationPaymentMethod.ccca,
  PaymentReconciliationPaymentMethod.cash,
]);

const CARD_METHODS = new Set([
  PaymentReconciliationPaymentMethod.debc,
  PaymentReconciliationPaymentMethod.ccca,
]);

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  [PaymentReconciliationPaymentMethod.debc]: "Debit Card",
  [PaymentReconciliationPaymentMethod.ccca]: "Credit Card",
  [PaymentReconciliationPaymentMethod.cash]: "Cash / UPI",
};

const getPaymentMethodLabel = (method: string): string =>
  PAYMENT_METHOD_LABEL[method] || method.toUpperCase();

const toDecimalString = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "0";
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2);
};

const derivePaymentMode = (method: string): PaymentMode =>
  CARD_METHODS.has(method as PaymentReconciliationPaymentMethod)
    ? PaymentMode.CARD
    : PaymentMode.BHARAT_QR;

export const PaymentDialog: FC<PaymentDialogProps> = ({
  facilityId,
  invoice,
  form,
}) => {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<string>();
  const [prId, setPrId] = useState<string | null>(null);
  const [settledPr, setSettledPr] = useState<PaymentReconciliation | null>(
    null
  );
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  const paymentMethod = (form.getValues("method") as string) || "";
  const isSelectedPaymentMethodSupported = SUPPORTED_METHODS.has(
    paymentMethod as PaymentReconciliationPaymentMethod
  );

  // Fall back to legacy `amount` field for parents that don't yet split the
  // tendered / returned amounts.
  const tenderedRaw = form.getValues("tendered_amount") ?? form.getValues("amount");
  const returnedRaw = form.getValues("returned_amount");
  const tenderedAmount = toDecimalString(tenderedRaw);
  const returnedAmount = toDecimalString(returnedRaw);
  const displayAmount =
    parseFloat(tenderedAmount) - parseFloat(returnedAmount);

  const handleSettled = useCallback(
    (pr: PaymentReconciliation) => {
      setSettledPr(pr);
      if (pr.outcome === PaymentReconciliationOutcome.complete) {
        if (pr.reference_number !== undefined) {
          form.setValue("reference_number", pr.reference_number ?? "");
        }
        if (pr.authorization !== undefined) {
          form.setValue("authorization", pr.authorization ?? "");
        }
        toast.success("Payment completed successfully");
      } else if (pr.outcome === PaymentReconciliationOutcome.error) {
        toast.error("Payment failed on the terminal");
      } else if (pr.outcome === PaymentReconciliationOutcome.partial) {
        toast.warning("Payment partially completed on the terminal");
      }
      if (invoice?.id) {
        queryClient.invalidateQueries({
          queryKey: ["invoice", invoice.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["payment_reconciliations"],
      });
    },
    [form, invoice?.id, queryClient]
  );

  const handleTimeout = useCallback(() => {
    setPollingTimedOut(true);
    toast.warning(
      "Transaction timed out. Please verify the status on the terminal."
    );
  }, []);

  const {
    pr: polledPr,
    isPolling,
  } = usePaymentReconciliationStatus(prId, {
    enabled: !!prId && !settledPr,
    onSettled: handleSettled,
    onTimeout: handleTimeout,
  });

  const livePr = settledPr ?? polledPr;
  const showSuccess =
    livePr?.outcome === PaymentReconciliationOutcome.complete;
  const showFailure =
    livePr?.outcome === PaymentReconciliationOutcome.error ||
    livePr?.outcome === PaymentReconciliationOutcome.partial;
  const isTransactionInProgress = !!prId && !showSuccess && !showFailure && !pollingTimedOut;

  const resetDialogState = useCallback(() => {
    setSelectedTerminal(undefined);
    setPrId(null);
    setSettledPr(null);
    setPollingTimedOut(false);
  }, []);

  const buildUploadPayload = useCallback((): UploadTransactionRequest | null => {
    const values = form.getValues() as Record<string, unknown>;

    const account =
      (values.account as string | undefined) ?? invoice?.account.id;
    const targetInvoice =
      (values.target_invoice as string | undefined) ?? invoice?.id ?? null;

    if (!selectedTerminal) {
      toast.error("Please select a terminal");
      return null;
    }
    if (!account) {
      toast.error("Account is required to record a payment");
      return null;
    }
    if (!paymentMethod) {
      toast.error("Payment method is required");
      return null;
    }

    const tendered = parseFloat(tenderedAmount);
    const returned = parseFloat(returnedAmount);
    if (!(tendered > 0)) {
      toast.error("Tendered amount must be greater than zero");
      return null;
    }
    if (returned >= tendered) {
      toast.error("Returned amount must be less than tendered amount");
      return null;
    }

    return {
      terminal: selectedTerminal,
      payment_mode: derivePaymentMode(paymentMethod),

      reconciliation_type:
        (values.reconciliation_type as PaymentReconciliationType) ??
        PaymentReconciliationType.payment,
      kind:
        (values.kind as PaymentReconciliationKind) ??
        PaymentReconciliationKind.online,
      issuer_type:
        (values.issuer_type as PaymentReconciliationIssuerType) ??
        PaymentReconciliationIssuerType.patient,
      method: paymentMethod as PaymentReconciliationPaymentMethod,
      tendered_amount: tenderedAmount,
      returned_amount: returnedAmount,
      is_credit_note: Boolean(values.is_credit_note ?? false),
      account,
      target_invoice: targetInvoice,
      location: (values.location as string | null | undefined) ?? null,
      disposition: (values.disposition as string | null | undefined) ?? null,
      note: (values.note as string | null | undefined) ?? null,
    };
  }, [
    form,
    invoice,
    paymentMethod,
    returnedAmount,
    selectedTerminal,
    tenderedAmount,
  ]);

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
        getPinelabsErrorMessage(error, "Failed to initiate the transaction")
      );
    },
  });

  const cancelTransactionMutation = useMutation({
    mutationFn: apis.gateway.cancel_transaction,
    onSuccess: () => {
      toast.success("Transaction cancelled");
      setIsOpen(false);
      resetDialogState();
    },
    onError: (error: unknown) => {
      console.error("Cancel Transaction: ", error);
      toast.error(
        getPinelabsErrorMessage(error, "Failed to cancel the transaction")
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
    resetDialogState();
  };

  const handleOpenChange = (open: boolean) => {
    // Lock the dialog open mid-transaction — dismissing would orphan a queued
    // PR. Users must wait for the outcome or explicitly Cancel.
    if (isTransactionInProgress) return;
    setIsOpen(open);
    if (!open) resetDialogState();
  };

  const triggerButton = useMemo(
    () =>
      !isSelectedPaymentMethodSupported ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-full">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled
              >
                <Link2Icon className="h-4 w-4" />
                Collect via Pinelabs Terminal
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Selected payment method is not supported.
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={!isSelectedPaymentMethodSupported}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isValid = await form.trigger();
            if (!isValid) return;

            setIsOpen(true);
          }}
        >
          <Link2Icon className="h-4 w-4" />
          Collect via Pinelabs Terminal
        </Button>
      ),
    [form, isSelectedPaymentMethodSupported]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={!isSelectedPaymentMethodSupported}>
        {triggerButton}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!isTransactionInProgress}
      >
        <DialogHeader>
          <DialogTitle>Receive Payment via Pinelabs Terminal</DialogTitle>
        </DialogHeader>

        {showSuccess && livePr ? (
          <SuccessView
            pr={livePr}
            paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
          />
        ) : showFailure && livePr ? (
          <FailureView
            pr={livePr}
            paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
            amount={displayAmount}
          />
        ) : pollingTimedOut ? (
          <TimedOutView
            paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
            amount={displayAmount}
          />
        ) : isTransactionInProgress ? (
          <InProgressView
            paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
            amount={displayAmount}
            isPolling={isPolling}
          />
        ) : (
          <FormView
            facilityId={facilityId}
            selectedTerminal={selectedTerminal}
            onTerminalChange={setSelectedTerminal}
            paymentMethodLabel={getPaymentMethodLabel(paymentMethod)}
            amount={displayAmount}
          />
        )}

        <DialogFooter>
          {showSuccess || showFailure || pollingTimedOut ? (
            <Button onClick={handleCloseAfterTerminal} className="w-full">
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
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleCollectPayment}
                disabled={
                  !selectedTerminal || !isSelectedPaymentMethodSupported
                }
                loading={uploadTransactionMutation.isPending}
              >
                Collect Payment
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type FormViewProps = {
  facilityId: string;
  selectedTerminal: string | undefined;
  onTerminalChange: (value: string) => void;
  paymentMethodLabel: string;
  amount: number;
};

const FormView: FC<FormViewProps> = ({
  facilityId,
  selectedTerminal,
  onTerminalChange,
  paymentMethodLabel,
  amount,
}) => (
  <div className="space-y-4">
    <SummaryRow label="Payment Method" value={paymentMethodLabel} />
    <SummaryRow label="Amount" value={formatCurrency(amount)} />
    <div className="space-y-2">
      <Label>Select Terminal</Label>
      <TerminalSelect
        facilityId={facilityId}
        value={selectedTerminal}
        onValueChange={onTerminalChange}
      />
    </div>
  </div>
);

type InProgressViewProps = {
  paymentMethodLabel: string;
  amount: number;
  isPolling: boolean;
};

const InProgressView: FC<InProgressViewProps> = ({
  paymentMethodLabel,
  amount,
  isPolling,
}) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-800 dark:bg-blue-950">
      <Loader2Icon className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-300" />
      <p className="mt-3 text-sm font-medium text-blue-800 dark:text-blue-200">
        Transaction in progress…
      </p>
      <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
        {isPolling
          ? "Waiting for the customer to complete the payment on the POS terminal."
          : "Checking status…"}
      </p>
    </div>
    <div className="space-y-2">
      <SummaryRow label="Payment Method" value={paymentMethodLabel} />
      <SummaryRow label="Amount" value={formatCurrency(amount)} />
    </div>
  </div>
);

type SuccessViewProps = {
  pr: PaymentReconciliation;
  paymentMethodLabel: string;
};

const SuccessView: FC<SuccessViewProps> = ({ pr, paymentMethodLabel }) => {
  const amountValue = pr.amount ? parseFloat(pr.amount) : undefined;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
        <CheckCircle2Icon className="mx-auto h-10 w-10 text-green-600 dark:text-green-300" />
        <p className="mt-3 text-sm font-semibold text-green-800 dark:text-green-200">
          Payment Completed Successfully
        </p>
        {pr.reference_number ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400">
              RRN
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {pr.reference_number}
            </p>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <SummaryRow label="Payment Method" value={paymentMethodLabel} />
        <SummaryRow label="Amount" value={formatCurrency(amountValue)} />
        {pr.authorization ? (
          <SummaryRow label="Approval Code" value={pr.authorization} mono />
        ) : null}
        {pr.payment_datetime ? (
          <SummaryRow
            label="Completed At"
            value={new Date(pr.payment_datetime).toLocaleString()}
          />
        ) : null}
      </div>
    </div>
  );
};

type FailureViewProps = {
  pr: PaymentReconciliation;
  paymentMethodLabel: string;
  amount: number;
};

const FailureView: FC<FailureViewProps> = ({
  pr,
  paymentMethodLabel,
  amount,
}) => {
  const isPartial = pr.outcome === PaymentReconciliationOutcome.partial;
  return (
    <div className="space-y-4">
      <div
        className={
          isPartial
            ? "rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950"
            : "rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950"
        }
      >
        <AlertCircleIcon
          className={
            isPartial
              ? "mx-auto h-10 w-10 text-amber-600 dark:text-amber-300"
              : "mx-auto h-10 w-10 text-red-600 dark:text-red-300"
          }
        />
        <p
          className={
            isPartial
              ? "mt-3 text-sm font-semibold text-amber-800 dark:text-amber-200"
              : "mt-3 text-sm font-semibold text-red-800 dark:text-red-200"
          }
        >
          {isPartial
            ? "Payment Partially Completed"
            : "Payment Failed on the Terminal"}
        </p>
        {pr.disposition ? (
          <p
            className={
              isPartial
                ? "mt-1 text-xs text-amber-700 dark:text-amber-300"
                : "mt-1 text-xs text-red-700 dark:text-red-300"
            }
          >
            {pr.disposition}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <SummaryRow label="Payment Method" value={paymentMethodLabel} />
        <SummaryRow label="Amount" value={formatCurrency(amount)} />
        {pr.reference_number ? (
          <SummaryRow label="RRN" value={pr.reference_number} mono />
        ) : null}
      </div>
    </div>
  );
};

type TimedOutViewProps = {
  paymentMethodLabel: string;
  amount: number;
};

const TimedOutView: FC<TimedOutViewProps> = ({
  paymentMethodLabel,
  amount,
}) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
      <ClockIcon className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-300" />
      <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
        Transaction Timed Out
      </p>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
        We stopped waiting for an outcome from the terminal. Please verify the
        payment status on the POS device directly before retrying.
      </p>
    </div>
    <div className="space-y-2">
      <SummaryRow label="Payment Method" value={paymentMethodLabel} />
      <SummaryRow label="Amount" value={formatCurrency(amount)} />
    </div>
  </div>
);

type SummaryRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

const SummaryRow: FC<SummaryRowProps> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between text-sm">
    <Label className="text-gray-600">{label}:</Label>
    <span className={mono ? "font-mono text-sm font-medium" : "font-medium"}>
      {value}
    </span>
  </div>
);
