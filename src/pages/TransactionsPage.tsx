import { FC, useCallback, useEffect, useState } from "react";
import dayjs from "@/lib/dayjs";
import { useTranslation } from "react-i18next";
import { useQueryParams } from "raviger";
import { useQuery } from "@tanstack/react-query";
import { I18NNAMESPACE, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { apis } from "@/apis";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionSort } from "@/components/transactions/TransactionSort";
import { TransactionDetailsSheet } from "@/components/transactions/TransactionDetailsSheet";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import { PaymentReconciliationStatus } from "@/types/payment_reconciliation";
import { Badge } from "@/components/ui/badge";

type TransactionsPageProps = {
  facilityId: string;
};

const DEFAULT_ORDERING = "-modified_date";

const parseDateOnlyParam = (value?: string) => {
  if (!value) return undefined;
  const parsed = dayjs(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.toDate() : undefined;
};

const TransactionsPage: FC<TransactionsPageProps> = ({ facilityId }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [qParams, setQueryParams] = useQueryParams<Record<string, string>>();
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);

  // Derived default (URL > current user) - never written to the URL itself,
  // so there's no mount-effect race. "none" marks an explicit clear.
  const { data: currentUser, isFetched: currentUserFetched } = useQuery({
    queryKey: ["pinelabs_current_user"],
    queryFn: () => apis.users.currentUser(),
  });
  const createdByCleared = qParams.created_by === "none";
  // Defer the table query until the default createdBy (URL or current user)
  // is settled, so the first request is never accidentally unscoped.
  const filtersReady =
    createdByCleared || !!qParams.created_by || currentUserFetched;

  const statusCleared = qParams.status === "none";

  const filters: Filters = {
    method: (qParams.method as Filters["method"]) || "",
    status: statusCleared
      ? ""
      : (qParams.status as PaymentReconciliationStatus) ||
        PaymentReconciliationStatus.completed,
    location: qParams.location || "",
    terminal: qParams.terminal || "",
    createdBy: createdByCleared
      ? ""
      : qParams.created_by || currentUser?.id || "",
    createdByUsername: createdByCleared
      ? ""
      : qParams.created_by_username || currentUser?.username || "",
    dateFrom: parseDateOnlyParam(qParams.created_date_after),
    dateTo: parseDateOnlyParam(qParams.created_date_before),
  };
  // 1-indexed, matching care_fe's native payments listing.
  const page = Number(qParams.page) || 1;
  const ordering = qParams.ordering || DEFAULT_ORDERING;

  // Fixed key order keeps the URL shape consistent across updates.
  const buildQueryParams = (f: Filters, pageNum: number, ord: string) => {
    const filterEntries = Object.fromEntries(
      Object.entries({
        method: f.method || "",
        status: f.status || "none",
        location: f.location || "",
        terminal: f.terminal || "",
        created_by: f.createdBy || (createdByCleared ? "none" : ""),
        created_by_username: f.createdByUsername || "",
        created_date_after: f.dateFrom
          ? dayjs(f.dateFrom).format("YYYY-MM-DD")
          : "",
        created_date_before: f.dateTo
          ? dayjs(f.dateTo).format("YYYY-MM-DD")
          : "",
      }).filter(([, value]) => value !== ""),
    );
    return {
      page: String(pageNum),
      limit: String(DEFAULT_PAGE_SIZE),
      ordering: ord,
      ...filterEntries,
    };
  };

  // Seed page/limit/ordering into the URL on first load.
  useEffect(() => {
    setQueryParams(buildQueryParams(filters, page, ordering), {
      overwrite: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltersChange = (newFilters: Filters) => {
    setQueryParams(buildQueryParams(newFilters, 1, ordering), {
      overwrite: true,
    });
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams(buildQueryParams(filters, newPage, ordering), {
      overwrite: true,
    });
  };

  const handleOrderingChange = (newOrdering: string) => {
    setQueryParams(buildQueryParams(filters, 1, newOrdering), {
      overwrite: true,
    });
  };

  // Stable identity so the table's count effect doesn't re-run on every render.
  const handleCountChange = useCallback((count: number) => {
    setTransactionCount(count);
  }, []);

  const handleRowClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setDetailsOpen(true);
  };

  return (
    <div className="w-full md:px-6 py-0">
      <div className="mt-3 mb-4">
        <div className="flex items-center justify-between px-3 md:px-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-700 mb-2">
                {t("pinelabs_transactions")}
              </h1>
              {transactionCount !== null && (
                <Badge
                  variant="secondary"
                  className="mb-2 px-3 py-0.5 text-xl font-bold text-gray-700"
                >
                  {transactionCount}
                </Badge>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              {t("pinelabs_transactions_description")}
            </p>
          </div>
        </div>

        <div className="px-3 md:px-0 mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <TransactionFilters
              facilityId={facilityId}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />

            <TransactionSort
              ordering={ordering}
              onOrderingChange={handleOrderingChange}
            />
          </div>

          <TransactionsTable
            facilityId={facilityId}
            filters={filters}
            page={page}
            limit={DEFAULT_PAGE_SIZE}
            ordering={ordering}
            enabled={filtersReady}
            onPageChange={handlePageChange}
            onRowClick={handleRowClick}
            onCountChange={handleCountChange}
          />
        </div>
      </div>

      <TransactionDetailsSheet
        facilityId={facilityId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        transactionId={selectedTransactionId}
      />
    </div>
  );
};

export default TransactionsPage;
