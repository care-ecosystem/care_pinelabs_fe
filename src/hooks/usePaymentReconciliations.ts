import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import {
  TransactionFilters,
  TransactionListParams,
} from "@/types/transaction_filters";
import dayjs from "@/lib/dayjs";

// "before" bound is the start of the *next* day so the end date is included.
const dateTimeQueryString = (date: Date, isEndDate = false) => {
  let d = dayjs(date).startOf("day");
  if (isEndDate) d = d.add(1, "day");
  return d.toISOString();
};

export const usePaymentReconciliations = (
  facilityId: string,
  filters: TransactionFilters,
  pagination: { offset: number; limit: number },
  ordering: string = "-payment_datetime",
) => {
  const params: TransactionListParams = {
    ...pagination,
    ordering,
  };

  if (filters.dateFrom) {
    params.created_date_after = dateTimeQueryString(filters.dateFrom);
  }
  if (filters.dateTo) {
    params.created_date_before = dateTimeQueryString(filters.dateTo, true);
  }
  if (filters.status && String(filters.status) !== "") {
    params.status = String(filters.status);
  }
  if (filters.method && String(filters.method) !== "") {
    params.method = String(filters.method);
  }
  if (filters.location && filters.location.trim() !== "") {
    params.location = filters.location.trim();
  }
  if (filters.createdBy && filters.createdBy.trim() !== "") {
    params.created_by = filters.createdBy.trim();
  }

  return useQuery({
    queryKey: ["payment_reconciliations", facilityId, params],
    queryFn: () => apis.payment_reconciliations.list(facilityId, params),
    enabled: !!facilityId,
  });
};
