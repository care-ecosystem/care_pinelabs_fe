import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePaymentReconciliations } from "@/hooks/usePaymentReconciliations";
import { TransactionFilters } from "@/types/transaction_filters";
import {
  PaymentReconciliation,
  PaymentReconciliationOutcome,
} from "@/types/payment_reconciliation";
import { formatCurrency } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import {
  Loader2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "lucide-react";

type TransactionsTableProps = {
  facilityId: string;
  filters: TransactionFilters;
  onRowClick: (transactionId: string) => void;
};

const ITEMS_PER_PAGE = 20;

export const TransactionsTable: FC<TransactionsTableProps> = ({
  facilityId,
  filters,
  onRowClick,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = usePaymentReconciliations(
    facilityId,
    filters,
    { offset: page * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE },
  );

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin mr-2" />
          <span>{t("loading_transactions")}</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-red-600">
          {t("error_loading_transactions")}
        </CardContent>
      </Card>
    );
  }

  const transactions = data?.results || [];
  const hasNext = !!data?.next;
  const hasPrevious = !!data?.previous;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("account")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("payment_initiated_date_time")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("invoice_number")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("payment_method")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("amount")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("reference_number")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("payment_completion_date_time")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t("status")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {t("no_transactions_found")}
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    onClick={() => onRowClick(transaction.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {transaction.account ? (
                        <a
                          href={`/facility/${facilityId}/billing/account/${transaction.account.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          {transaction.account.name}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.created_date
                        ? dayjs(transaction.created_date).format(
                            "MMM D, YYYY h:mm A",
                          )
                        : "NA"}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {transaction.target_invoice ? (
                        <a
                          href={`/facility/${facilityId}/billing/invoices/${transaction.target_invoice.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          {transaction.target_invoice.number}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t(`payment_method_${transaction.method}`, transaction.method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(Number(transaction.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.reference_number || "NA"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.payment_datetime
                        ? dayjs(transaction.payment_datetime).format(
                            "MMM D, YYYY h:mm A",
                          )
                        : "NA"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(transaction.outcome)}>
                        {t(`status_${transaction.outcome}`)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              {t("showing_results", {
                from: page * ITEMS_PER_PAGE + 1,
                to: Math.min(
                  (page + 1) * ITEMS_PER_PAGE,
                  data?.count || 0,
                ),
                total: data?.count || 0,
              })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!hasPrevious}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!hasNext}
              >
                {t("next")}
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
