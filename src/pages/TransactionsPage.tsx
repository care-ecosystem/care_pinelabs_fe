import { FC, useEffect, useState } from "react";
import dayjs from "@/lib/dayjs";
import { useTranslation } from "react-i18next";
import { useQueryParams } from "raviger";
import { useQuery } from "@tanstack/react-query";
import { I18NNAMESPACE } from "@/lib/constants";
import { apis } from "@/apis";
import {
  TransactionsTable,
  ITEMS_PER_PAGE,
} from "@/components/transactions/TransactionsTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionSort } from "@/components/transactions/TransactionSort";
import { TransactionDetailsSheet } from "@/components/transactions/TransactionDetailsSheet";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import {
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationStatus,
} from "@/types/payment_reconciliation";
import { Badge } from "@/components/ui/badge";

type TransactionsPageProps = {
  facilityId: string;
};

const DEFAULT_ORDERING = "-payment_datetime";

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
  const [totalCount, setTotalCount] = useState(0);

  // Derived default (URL > current user) - never written to the URL itself,
  // so there's no mount-effect race. "none" marks an explicit clear.
  const { data: currentUser } = useQuery({
    queryKey: ["pinelabs_current_user"],
    queryFn: () => apis.users.currentUser(),
  });
  const createdByCleared = qParams.created_by === "none";

  const filters: Filters = {
    method:
      (qParams.method as PaymentReconciliationPaymentMethod) ||
      PaymentReconciliationPaymentMethod.ddpo,
    status: (qParams.status as PaymentReconciliationStatus) || "",
    location: qParams.location || "",
    createdBy: createdByCleared
      ? ""
      : qParams.created_by || currentUser?.id || "",
    createdByUsername: createdByCleared
      ? ""
      : qParams.created_by_username || currentUser?.username || "",
    dateFrom: parseDateOnlyParam(qParams.created_date_after),
    dateTo: parseDateOnlyParam(qParams.created_date_before),
  };
  const page = Number(qParams.page) || 0;
  const ordering = qParams.ordering || DEFAULT_ORDERING;

  // Fixed key order keeps the URL shape consistent across updates.
  const buildQueryParams = (f: Filters, pageNum: number, ord: string) => {
    const filterEntries = Object.fromEntries(
      Object.entries({
        method: f.method || "",
        status: f.status || "",
        location: f.location || "",
        created_by: f.createdBy || "",
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
      limit: String(ITEMS_PER_PAGE),
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
    setQueryParams(buildQueryParams(newFilters, 0, ordering), {
      overwrite: true,
    });
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams(buildQueryParams(filters, newPage, ordering), {
      overwrite: true,
    });
  };

  const handleOrderingChange = (newOrdering: string) => {
    setQueryParams(buildQueryParams(filters, 0, newOrdering), {
      overwrite: true,
    });
  };

  const handleRowClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setDetailsOpen(true);
  };

  const handleCountChange = (count: number) => {
    setTotalCount(count);
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
              <Badge variant="secondary" className="text-base px-3 py-1">
                {totalCount}
              </Badge>
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
            ordering={ordering}
            onPageChange={handlePageChange}
            onRowClick={handleRowClick}
            onCountChange={handleCountChange}
          />
        </div>
      </div>

      <TransactionDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        transactionId={selectedTransactionId}
      />
    </div>
  );
};

export default TransactionsPage;
