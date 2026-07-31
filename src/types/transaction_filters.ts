import {
  PaymentReconciliationStatus,
  PaymentReconciliationPaymentMethod,
} from "@/types/payment_reconciliation";

export type TransactionFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  status?: PaymentReconciliationStatus | "";
  method?: PaymentReconciliationPaymentMethod | "";
  location?: string;
  createdBy?: string;
  // UI-only: lets the user filter be redisplayed (name/avatar) after a page
  // refresh, since the API has no lookup-by-id endpoint for users.
  createdByUsername?: string;
};

export type TransactionListParams = {
  offset: number;
  limit: number;
  ordering: string;
  created_date_after?: string;
  created_date_before?: string;
  status?: string;
  method?: string;
  location?: string;
  created_by?: string;
};
