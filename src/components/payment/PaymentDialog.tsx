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
import { Badge } from "@/components/ui/badge";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationType,
  PaymentReconciliationStatus,
} from "@/types/payment_reconciliation";
import { I18NNAMESPACE } from "@/lib/constants";
import { PaymentMode, UploadTransactionRequest } from "@/types/gateway";
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
import { getPaymentMethodLabel } from "@/lib/paymentMethods";
import { MetaTable } from "@/components/transactions/MetaTable";

export type PaymentDialogProps = {
  facilityId: string;
  invoice?: Invoice;
  form?: UseFormReturn;
  disabled?: boolean;
  disabledReason?: string;
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

// Removed - now using shared getPaymentMethodLabel from @/lib/paymentMethods


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

const getStatusBadgeVariant = (status: PaymentReconciliationStatus) => {
  switch (status) {
    case PaymentReconciliationStatus.active:
      return "default";
    case PaymentReconciliationStatus.draft:
      return "secondary";
    case PaymentReconciliationStatus.cancelled:
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusLabel = (status: PaymentReconciliationStatus) => {
  switch (status) {
    case PaymentReconciliationStatus.active:
      return "status_completed";
    case PaymentReconciliationStatus.draft:
      return "status_pending";
    case PaymentReconciliationStatus.cancelled:
      return "status_cancelled";
    default:
      return "status";
  }
};

export const PaymentDialog: FC<PaymentDialogProps> = ({
  facilityId,
  invoice,
  form,
  disabled,
  disabledReason,
}) => {
  console.error("🔵 [PaymentDialog] Component rendered");
  const { t } = useTranslation(I18NNAMESPACE);
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<string>();
  const [prId, setPrId] = useState<string | null>(null);
  const [settledPr, setSettledPr] = useState<PaymentReconciliation | null>(
    null,
  );
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  const paymentMethod = (form?.getValues("method") as string) || "";
  const isSelectedPaymentMethodSupported = SUPPORTED_METHODS.has(
    paymentMethod as PaymentReconciliationPaymentMethod,
  );

  const invoiceAmountDue = invoice
    ? Number(invoice.total_gross) - parseFloat(invoice.total_payments || "0")
    : undefined;

  const tenderedRaw =
    invoiceAmountDue ??
    form?.getValues("tendered_amount") ??
    form?.getValues("amount");
  const returnedRaw = form?.getValues("returned_amount");
  const tenderedAmount = toDecimalString(tenderedRaw);
  const returnedAmount = toDecimalString(returnedRaw);
  const displayAmount = parseFloat(tenderedAmount) - parseFloat(returnedAmount);

  const handleSettled = useCallback(
    (pr: PaymentReconciliation) => {
      setSettledPr(pr);
      if (pr.outcome === PaymentReconciliationOutcome.complete) {
        if (pr.reference_number !== undefined) {
          form?.setValue("reference_number", pr.reference_number ?? "");
        }
        if (pr.authorization !== undefined) {
          form?.setValue("authorization", pr.authorization ?? "");
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
    [form, invoice?.id, queryClient],
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

  const resetDialogState = useCallback(() => {
    setSelectedTerminal(undefined);
    setPrId(null);
    setSettledPr(null);
    setPollingTimedOut(false);
  }, []);

  const buildUploadPayload =
    useCallback((): UploadTransactionRequest | null => {
      const values = form?.getValues() as Record<string, unknown>;

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
        getPinelabsErrorMessage(error, "Failed to initiate the transaction"),
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
    resetDialogState();
  };

  const handleOpenChange = (open: boolean) => {
    console.error("🟡 [PaymentDialog] handleOpenChange called:", {
      open,
      isTransactionInProgress,
      uploadPending: uploadTransactionMutation.isPending,
      shouldBlock: isTransactionInProgress || uploadTransactionMutation.isPending,
    });

    // Lock the dialog open mid-transaction — dismissing would orphan a queued
    // PR. Users must wait for the outcome or explicitly Cancel.
    if (isTransactionInProgress || uploadTransactionMutation.isPending) {
      console.error("🛑 [PaymentDialog] BLOCKED - Transaction in progress");
      toast.warning(t("toast_wait_for_transaction"));
      return; // Don't call setIsOpen - keep dialog locked open
    }

    console.error("✅ [PaymentDialog] ALLOWING - Setting isOpen to:", open);
    setIsOpen(open);
    if (!open) resetDialogState();
  };

  // Additional safeguard: prevent dialog from closing during transaction
  // This blocks ESC key, outside clicks, and close button during active transactions
  const shouldBlockClose = isTransactionInProgress || uploadTransactionMutation.isPending;

  // Log state changes for debugging
  useEffect(() => {
    console.error("[PaymentDialog] State changed:", {
      isOpen,
      prId,
      showSuccess,
      showFailure,
      pollingTimedOut,
      isTransactionInProgress,
      uploadPending: uploadTransactionMutation.isPending,
      shouldBlockClose,
    });
  }, [
    isOpen,
    prId,
    showSuccess,
    showFailure,
    pollingTimedOut,
    isTransactionInProgress,
    uploadTransactionMutation.isPending,
    shouldBlockClose,
  ]);

  // Track isOpen state changes specifically
  useEffect(() => {
    console.error("🔴 [PaymentDialog] isOpen changed to:", isOpen);
  }, [isOpen]);

  // Expose debug state to window for easy inspection
  useEffect(() => {
    (window as any).paymentDialogDebug = {
      isOpen,
      prId,
      isTransactionInProgress,
      uploadPending: uploadTransactionMutation.isPending,
      shouldBlockClose,
      showSuccess,
      showFailure,
      pollingTimedOut,
    };
  });

  const isDisabled = disabled || !isSelectedPaymentMethodSupported;
  const tooltipReason = disabled && disabledReason
    ? t(disabledReason)
    : !isSelectedPaymentMethodSupported
    ? t("selected_payment_method_not_supported")
    : undefined;

  const triggerButton = useMemo(
    () =>
      isDisabled ? (
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
                {t("collect_via_pinelabs_terminal")}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {tooltipReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isValid = await form?.trigger();
            if (!isValid) return;

            setIsOpen(true);
          }}
        >
          <Link2Icon className="h-4 w-4" />
          {t("collect_via_pinelabs_terminal")}
        </Button>
      ),
    [form, isDisabled, tooltipReason, t],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={isDisabled}>
        {triggerButton}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!shouldBlockClose}
        onEscapeKeyDown={(e) => {
          console.error("⌨️ [PaymentDialog] ESC Key pressed:", {
            shouldBlockClose,
            isTransactionInProgress,
            uploadPending: uploadTransactionMutation.isPending,
          });
          if (shouldBlockClose) {
            console.error("🛑 [PaymentDialog] ESC Key BLOCKED - Preventing default");
            e.preventDefault();
            e.stopPropagation();
            toast.warning(t("toast_wait_for_transaction"));
          } else {
            console.error("✅ [PaymentDialog] ESC Key ALLOWED - Dialog will close");
          }
        }}
        onPointerDownOutside={(e) => {
          console.error("🖱️ [PaymentDialog] Pointer down outside:", {
            shouldBlockClose,
          });
          if (shouldBlockClose) {
            console.error("🛑 [PaymentDialog] Pointer BLOCKED");
            e.preventDefault();
            toast.warning(t("toast_wait_for_transaction"));
          }
        }}
        onInteractOutside={(e) => {
          console.error("👆 [PaymentDialog] Interact outside:", {
            shouldBlockClose,
          });
          if (shouldBlockClose) {
            console.error("🛑 [PaymentDialog] Interact BLOCKED");
            e.preventDefault();
            toast.warning(t("toast_wait_for_transaction"));
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("receive_payment_via_pinelabs_terminal")}</DialogTitle>
        </DialogHeader>

        {showSuccess && livePr ? (
          <SuccessView
            pr={livePr}
            paymentMethodLabel={t(getPaymentMethodLabel(paymentMethod))}
          />
        ) : showFailure && livePr ? (
          <FailureView
            pr={livePr}
            paymentMethodLabel={t(getPaymentMethodLabel(paymentMethod))}
            amount={displayAmount}
          />
        ) : pollingTimedOut ? (
          <TimedOutView
            paymentMethodLabel={t(getPaymentMethodLabel(paymentMethod))}
            amount={displayAmount}
          />
        ) : isTransactionInProgress ? (
          <InProgressView
            paymentMethodLabel={t(getPaymentMethodLabel(paymentMethod))}
            amount={displayAmount}
            isPolling={isPolling}
          />
        ) : (
          <FormView
            facilityId={facilityId}
            selectedTerminal={selectedTerminal}
            onTerminalChange={setSelectedTerminal}
            paymentMethodLabel={t(getPaymentMethodLabel(paymentMethod))}
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
                <Button variant="outline">{t("cancel")}</Button>
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
  invoice?: Invoice;
};

const FormView: FC<FormViewProps> = ({
  facilityId,
  selectedTerminal,
  onTerminalChange,
  paymentMethodLabel,
  amount,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  return (
    <div className="space-y-4">
      <SummaryRow label={t("payment_method")} value={paymentMethodLabel} />
      <SummaryRow label={t("amount")} value={formatCurrency(amount)} />
      <div className="space-y-2">
        <Label>{t("select_terminal")}</Label>
        <TerminalSelect
          facilityId={facilityId}
          value={selectedTerminal}
          onValueChange={onTerminalChange}
        />
      </div>
    </div>
  );
};

type InProgressViewProps = {
  paymentMethodLabel: string;
  amount: number;
  isPolling: boolean;
};

export const InProgressView: FC<InProgressViewProps> = ({ paymentMethodLabel, amount, isPolling }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  return (
  <div className="space-y-4">
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-800 dark:bg-blue-950">
      <Loader2Icon className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-300" />
      <p className="mt-3 text-sm font-medium text-blue-800 dark:text-blue-200">
        {t("transaction_in_progress")}
      </p>
      <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
        {isPolling
          ? t("waiting_for_customer")
          : t("checking_status")}
      </p>
    </div>
    <div className="space-y-2">
      <SummaryRow label={t("payment_method")} value={paymentMethodLabel} />
      <SummaryRow label={t("amount")} value={formatCurrency(amount)} />
    </div>
  </div>
  );
};

type SuccessViewProps = {
  pr: PaymentReconciliation;
  paymentMethodLabel: string;
};

export const SuccessView: FC<SuccessViewProps> = ({
  pr,
  paymentMethodLabel,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const amountValue = pr.amount ? parseFloat(pr.amount) : undefined;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
        <CheckCircle2Icon className="mx-auto h-10 w-10 text-green-600 dark:text-green-300" />
        <p className="mt-3 text-sm font-semibold text-green-800 dark:text-green-200">
          {t("payment_completed_successfully")}
        </p>
        {pr.reference_number ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400">
              {t("rrn")}</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {pr.reference_number}
            </p>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <Label className="text-gray-600">{t("status")}:</Label>
          <Badge variant={getStatusBadgeVariant(pr.status)}>
            {t(getStatusLabel(pr.status))}
          </Badge>
        </div>
        <SummaryRow label={t("payment_method")} value={paymentMethodLabel} />
        <SummaryRow label={t("amount")} value={formatCurrency(amountValue)} />
        {pr.authorization ? (
          <SummaryRow label={t("approval_code")} value={pr.authorization} mono />
        ) : null}
        {pr.payment_datetime ? (
          <SummaryRow
            label={t("completed_at")}
            value={new Date(pr.payment_datetime).toLocaleString()}
          />
        ) : null}
      </div>

      {/* Pinelabs Meta Data */}
      {pr.meta?.pinelabs && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">
            {t("pinelabs_details")}
          </p>
          <MetaTable data={pr.meta.pinelabs} />
        </div>
      )}
    </div>
  );
};

type FailureViewProps = {
  pr: PaymentReconciliation;
  paymentMethodLabel: string;
  amount: number;
};

export const FailureView: FC<FailureViewProps> = ({ pr, paymentMethodLabel, amount }) => {
  const { t } = useTranslation(I18NNAMESPACE);
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
            ? t("payment_partially_completed")
            : t("payment_failed_on_terminal")}
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
        <div className="flex items-center justify-between text-sm">
          <Label className="text-gray-600">{t("status")}:</Label>
          <Badge variant={getStatusBadgeVariant(pr.status)}>
            {t(getStatusLabel(pr.status))}
          </Badge>
        </div>
        <SummaryRow label={t("payment_method")} value={paymentMethodLabel} />
        <SummaryRow label={t("amount")} value={formatCurrency(amount)} />
        {pr.reference_number ? (
          <SummaryRow label={t("rrn")} value={pr.reference_number} mono />
        ) : null}
      </div>

      {/* Pinelabs Meta Data */}
      {pr.meta?.pinelabs && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">
            {t("pinelabs_details")}
          </p>
          <MetaTable data={pr.meta.pinelabs} />
        </div>
      )}
    </div>
  );
};


type TimedOutViewProps = {
  paymentMethodLabel: string;
  amount: number;
};

export const TimedOutView: FC<TimedOutViewProps> = ({ paymentMethodLabel, amount }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  return (
  <div className="space-y-4">
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
      <ClockIcon className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-300" />
      <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
        {t("transaction_timed_out")}
      </p>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
        {t("transaction_timeout_message")}
      </p>
    </div>
    <div className="space-y-2">
      <SummaryRow label={t("payment_method")} value={paymentMethodLabel} />
      <SummaryRow label={t("amount")} value={formatCurrency(amount)} />
    </div>
  </div>
  );
};

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
