import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import {
  TransactionFilters,
  TransactionListParams,
} from "@/types/transaction_filters";
import dayjs from "@/lib/dayjs";

export const usePaymentReconciliations = (
  facilityId: string,
  filters: TransactionFilters,
  pagination: { offset: number; limit: number },
) => {
  const params: TransactionListParams = {
    ...pagination,
    ordering: "-payment_datetime",
  };

  if (filters.dateFrom) {
    params.created_date_after = dayjs(filters.dateFrom).format("YYYY-MM-DD");
  }
  if (filters.dateTo) {
    params.created_date_before = dayjs(filters.dateTo).format("YYYY-MM-DD");
  }
  if (filters.outcome && String(filters.outcome) !== "") {
    params.outcome = String(filters.outcome);
  }
  if (filters.method && String(filters.method) !== "") {
    params.method = String(filters.method);
  }
  if (filters.invoiceNumber && filters.invoiceNumber.trim() !== "") {
    params.invoice_number = filters.invoiceNumber.trim();
  }

  return useQuery({
    queryKey: ["payment_reconciliations", facilityId, params],
    queryFn: () => apis.payment_reconciliations.list(facilityId, params),
    enabled: !!facilityId,
  });
};
