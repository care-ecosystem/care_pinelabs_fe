import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaymentReconciliations } from "@/hooks/usePaymentReconciliations";
import { TransactionFilters } from "@/types/transaction_filters";
import { PaymentReconciliationOutcome } from "@/types/payment_reconciliation";
import { formatCurrency } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import {
  CreditCardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "lucide-react";

type TransactionsTableProps = {
  facilityId: string;
  filters: TransactionFilters;
  page: number;
  ordering: string;
  onPageChange: (page: number) => void;
  onRowClick: (transactionId: string) => void;
  onCountChange?: (count: number) => void;
};

export const ITEMS_PER_PAGE = 20;
const COLUMN_COUNT = 8;

const TableSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow>
        {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
          <TableHead key={i}>
            <Skeleton className="h-4 w-20" />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const TransactionsTable: FC<TransactionsTableProps> = ({
  facilityId,
  filters,
  page,
  ordering,
  onPageChange,
  onRowClick,
  onCountChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  const { data, isLoading, error } = usePaymentReconciliations(
    facilityId,
    filters,
    { offset: page * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE },
    ordering,
  );

  // Update parent with count when data changes
  useEffect(() => {
    if (data?.count !== undefined && onCountChange) {
      onCountChange(data.count);
    }
  }, [data?.count, onCountChange]);

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
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        {t("error_loading_transactions")}
      </div>
    );
  }

  const transactions = data?.results || [];
  const hasNext = !!data?.next;
  const hasPrevious = !!data?.previous;

  return (
    <div>
      {transactions.length === 0 ? (
        <EmptyState
          icon={<CreditCardIcon className="text-primary size-6" />}
          title={t("no_transactions_found")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("account")}</TableHead>
              <TableHead>{t("payment_initiated_date_time")}</TableHead>
              <TableHead>{t("invoice")}</TableHead>
              <TableHead>{t("payment_method")}</TableHead>
              <TableHead>{t("amount")}</TableHead>
              <TableHead>{t("reference_number")}</TableHead>
              <TableHead>{t("payment_completion_date_time")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                onClick={() => onRowClick(transaction.id)}
                className="cursor-pointer"
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {transaction.account ? (
                    <Button variant="link" asChild>
                      <a
                        href={`/facility/${facilityId}/billing/account/${transaction.account.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        <div className="text-base flex items-center gap-1 underline underline-offset-2">
                          {transaction.account.name}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </div>
                      </a>
                    </Button>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {transaction.created_date
                    ? dayjs(transaction.created_date).format(
                        "MMM D, YYYY h:mm A",
                      )
                    : "NA"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {transaction.target_invoice ? (
                    <Button variant="link" asChild>
                      <a
                        href={`/facility/${facilityId}/billing/invoices/${transaction.target_invoice.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        {transaction.target_invoice.number || t("view_invoice")}
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {t(`payment_method_${transaction.method}`, transaction.method)}
                </TableCell>
                <TableCell>{formatCurrency(Number(transaction.amount))}</TableCell>
                <TableCell>{transaction.reference_number || "NA"}</TableCell>
                <TableCell>
                  {transaction.payment_datetime
                    ? dayjs(transaction.payment_datetime).format(
                        "MMM D, YYYY h:mm A",
                      )
                    : "NA"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusBadgeVariant(transaction.outcome)}
                    className="px-2.5 py-px text-sm font-medium"
                  >
                    {t(`status_${transaction.outcome}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            {t("showing_results", {
              from: page * ITEMS_PER_PAGE + 1,
              to: Math.min((page + 1) * ITEMS_PER_PAGE, data?.count || 0),
              total: data?.count || 0,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevious}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
            >
              {t("next")}
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
