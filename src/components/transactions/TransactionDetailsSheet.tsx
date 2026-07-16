import { FC } from "react";
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

type TransactionDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentReconciliation | null;
};

export const TransactionDetailsSheet: FC<TransactionDetailsSheetProps> = ({
  open,
  onOpenChange,
  transaction,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  if (!transaction) return null;

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

          {/* Payment Method */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {t("payment_method")}
            </p>
            <p className="text-base">
              {t(`payment_method_${transaction.method}`, transaction.method)}
            </p>
          </div>

          {/* Date & Time */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {t("date_time")}
            </p>
            <p className="text-base">
              {dayjs(transaction.payment_datetime).format(
                "MMMM D, YYYY h:mm A",
              )}
            </p>
          </div>

          {/* Reference Number (RRN) */}
          {transaction.reference_number && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("rrn")}
              </p>
              <p className="text-base font-mono">
                {transaction.reference_number}
              </p>
            </div>
          )}

          {/* Approval Code */}
          {transaction.authorization && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("approval_code")}
              </p>
              <p className="text-base font-mono">{transaction.authorization}</p>
            </div>
          )}

          {/* Tendered Amount */}
          {transaction.tendered_amount && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("tendered_amount")}
              </p>
              <p className="text-base">
                {formatCurrency(Number(transaction.tendered_amount))}
              </p>
            </div>
          )}

          {/* Returned Amount */}
          {transaction.returned_amount &&
            Number(transaction.returned_amount) > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {t("returned_amount")}
                </p>
                <p className="text-base">
                  {formatCurrency(Number(transaction.returned_amount))}
                </p>
              </div>
            )}

          {/* Note */}
          {transaction.note && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("note")}
              </p>
              <p className="text-base text-gray-700">{transaction.note}</p>
            </div>
          )}

          {/* Disposition */}
          {transaction.disposition && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {t("disposition")}
              </p>
              <p className="text-base text-gray-700">
                {transaction.disposition}
              </p>
            </div>
          )}

          {/* Transaction Type */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {t("transaction_type")}
            </p>
            <p className="text-base">
              {t(
                `reconciliation_type_${transaction.reconciliation_type}`,
                transaction.reconciliation_type,
              )}
            </p>
          </div>

          {/* Transaction Kind */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              {t("transaction_kind")}
            </p>
            <p className="text-base">
              {t(`kind_${transaction.kind}`, transaction.kind)}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
