import { FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  StatusBadge,
  StatusBadgeColor,
} from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { PaymentReconciliationStatus } from "@/types/payment_reconciliation";
import { formatCurrency, toast } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Loader2Icon, RefreshCwIcon, XIcon } from "lucide-react";
import { MetaTable } from "./MetaTable";
import { getPinelabsErrorMessage } from "@/lib/errors";

type TransactionDetailsSheetProps = {
  facilityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
};

export const TransactionDetailsSheet: FC<TransactionDetailsSheetProps> = ({
  facilityId,
  open,
  onOpenChange,
  transactionId,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const queryClient = useQueryClient();

  const {
    data: transaction,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transaction_status", transactionId],
    queryFn: () =>
      apis.gateway.transaction_status({
        payment_reconciliation: transactionId!,
      }),
    enabled: !!transactionId && open,
  });

  useEffect(() => {
    if (open && transactionId) {
      refetch();
    }
  }, [open, transactionId, refetch]);

  // Extract terminal ID from meta.pinelabs
  const terminalId = useMemo(() => {
    if (!transaction?.meta?.pinelabs) return null;
    const pinelabs = transaction.meta.pinelabs as Record<string, unknown>;
    return pinelabs.terminal_id as string | null;
  }, [transaction]);

  const { data: pinelabsConfig } = useQuery({
    queryKey: ["pinelabs_config", facilityId],
    queryFn: () => apis.pinelabs_config.get(facilityId),
    enabled: !!facilityId && !!terminalId,
  });

  const { data: posTerminals } = useQuery({
    queryKey: ["pinelabs_config", pinelabsConfig?.id, "pos-terminals", "all"],
    queryFn: () => apis.pinelabs_config.getTerminals(pinelabsConfig!.id, false),
    enabled: !!pinelabsConfig?.id,
  });

  const terminalDevice = posTerminals?.find((t) => t.id === terminalId)?.device;

  // Refresh transaction status mutation
  const refreshStatusMutation = useMutation({
    mutationFn: apis.gateway.refresh_transaction_status,
    onSuccess: (data) => {
      if (data.status_changed) {
        toast.success(t("toast_transaction_status_updated"));
        // Invalidate and refetch queries
        queryClient.invalidateQueries({
          queryKey: ["transaction_status", transactionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["payment_reconciliations"],
        });
        refetch();
      } else {
        toast.info(t("toast_no_status_change"));
      }
    },
    onError: (error: unknown) => {
      toast.error(
        getPinelabsErrorMessage(error, t("error_failed_to_refresh_status")),
      );
    },
  });

  // Cancel transaction mutation
  const cancelTransactionMutation = useMutation({
    mutationFn: apis.gateway.cancel_transaction,
    onSuccess: () => {
      toast.success(t("toast_transaction_cancelled"));
      // Invalidate and refetch queries
      queryClient.invalidateQueries({
        queryKey: ["transaction_status", transactionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["payment_reconciliations"],
      });
      refetch();
    },
    onError: (error: unknown) => {
      toast.error(
        getPinelabsErrorMessage(error, t("error_failed_to_cancel_transaction")),
      );
    },
  });

  const handleRefreshStatus = () => {
    if (!transactionId) return;
    refreshStatusMutation.mutate({ payment_reconciliation: transactionId });
  };

  const handleCancelTransaction = () => {
    if (!transactionId) return;
    cancelTransactionMutation.mutate({ payment_reconciliation: transactionId });
  };

  // Check if transaction is in progress (in_progress status)
  const isInProgress = transaction?.status === PaymentReconciliationStatus.in_progress;

  if (!transactionId) return null;

  const getStatusBadgeColor = (
    outcome: PaymentReconciliationStatus,
  ): StatusBadgeColor => {
    switch (outcome) {
      case PaymentReconciliationStatus.completed:
        return "success";
      case PaymentReconciliationStatus.failed:
        return "danger";
      case PaymentReconciliationStatus.partial:
        return "warning";
      default:
        return "warning";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("transaction_details")}</SheetTitle>
          <SheetDescription>
            {t("transaction_details_description")}
          </SheetDescription>
        </SheetHeader>

        {/* Action Buttons */}
        {transaction && (
          <div className="py-4 space-y-3">
            {/* Refresh Button - Always show */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={refreshStatusMutation.isPending || cancelTransactionMutation.isPending}
              className="w-full"
            >
              <RefreshCwIcon
                className={`h-4 w-4 mr-2 ${refreshStatusMutation.isPending ? "animate-spin" : ""}`}
              />
              {t("refresh_status_from_pinelabs")}
            </Button>

            {/* Cancel Button - Only show for in-progress transactions */}
            {isInProgress && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelTransaction}
                disabled={cancelTransactionMutation.isPending || refreshStatusMutation.isPending}
                className="w-full"
              >
                <XIcon className="h-4 w-4 mr-2" />
                {cancelTransactionMutation.isPending
                  ? t("cancelling_transaction")
                  : t("cancel_transaction")}
              </Button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-6 w-6 animate-spin mr-2" />
            <span>{t("loading_transactions")}</span>
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-red-600">
            {t("error_loading_transactions")}
          </div>
        )}

        {transaction && (
          <div className="space-y-6 py-6">
          {/* Status */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {t("status")}
            </p>
            <StatusBadge color={getStatusBadgeColor(transaction.status)}>
              {t(`status_${transaction.status}`)}
            </StatusBadge>
          </div>

          {/* Invoice Information */}
          {transaction.target_invoice && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("invoice_number")}
              </p>
              <p className="text-base font-medium">
                {transaction.target_invoice.number}
              </p>
            </div>
          )}

          {/* Amount */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {t("amount")}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(Number(transaction.amount))}
            </p>
          </div>

          {/* Terminal Information */}
          {terminalDevice && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("terminal")}
              </p>
              <p className="text-base font-medium">
                {terminalDevice.registered_name}
              </p>
            </div>
          )}

          {/* Pinelabs Meta Data */}
          {transaction.meta?.pinelabs && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                {t("pinelabs_details")}
              </p>
              <MetaTable data={transaction.meta.pinelabs} />
            </div>
          )}
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
