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
import { Badge } from "@/components/ui/badge";
import {
  PaymentReconciliation,
  PaymentReconciliationOutcome,
} from "@/types/payment_reconciliation";
import { formatCurrency } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Loader2Icon } from "lucide-react";
import { MetaTable } from "./MetaTable";

type TransactionDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
};

export const TransactionDetailsSheet: FC<TransactionDetailsSheetProps> = ({
  open,
  onOpenChange,
  transactionId,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

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

  // Fetch terminal details if terminal ID exists
  const { data: terminal } = useQuery({
    queryKey: ["pinelabs_terminal", terminalId],
    queryFn: () => apis.pinelabs_terminals.get(terminalId!),
    enabled: !!terminalId,
  });

  if (!transactionId) return null;

  const getStatusBadgeVariant = (outcome: PaymentReconciliationOutcome) => {
    switch (outcome) {
      case PaymentReconciliationOutcome.complete:
        return "default";
      case PaymentReconciliationOutcome.error:
        return "destructive";
      case PaymentReconciliationOutcome.partial:
        return "secondary";
      default:
        return "outline";
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
            <Badge variant={getStatusBadgeVariant(transaction.outcome)}>
              {t(`status_${transaction.outcome}`)}
            </Badge>
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
          {terminal && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("terminal")}
              </p>
              <p className="text-base">
                {terminal.name} ({terminal.client_id})
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
