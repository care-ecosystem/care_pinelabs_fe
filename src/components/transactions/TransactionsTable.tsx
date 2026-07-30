import { FC, useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onRowClick: (transactionId: string) => void;
  onCountChange?: (count: number) => void;
};

const ITEMS_PER_PAGE = 20;
const COLUMN_COUNT = 8;

const SORT_OPTIONS: Record<string, string> = {
  "-payment_datetime": "sort_by_latest_payment",
  payment_datetime: "sort_by_oldest_payment",
  "-created_date": "sort_by_latest_created",
  created_date: "sort_by_oldest_created",
};

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
  onRowClick,
  onCountChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [page, setPage] = useState(0);
  const [ordering, setOrdering] = useState("-payment_datetime");

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

  const sortSelect = (
    <div className="flex justify-end mb-4">
      <div className="w-full sm:w-fit">
        <Select
          value={ordering}
          onValueChange={(value) => {
            setOrdering(value);
            setPage(0);
          }}
        >
          <SelectTrigger
            aria-label={t("sort_by")}
            className="border-gray-400 text-gray-950 rounded-sm"
          >
            <SelectValue placeholder={t("sort_by")} />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(SORT_OPTIONS).map(([value, text]) => (
              <SelectItem key={text} value={value}>
                {t(text)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {sortSelect}
        <TableSkeleton />
      </div>
    );
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
      {sortSelect}

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
              <TableHead>{t("invoice_number")}</TableHead>
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
                  <Badge variant={getStatusBadgeVariant(transaction.outcome)}>
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
    </div>
  );
};
