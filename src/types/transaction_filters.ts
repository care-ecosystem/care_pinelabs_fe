import {
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
} from "@/types/payment_reconciliation";

export type TransactionFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  outcome?: PaymentReconciliationOutcome | "";
  method?: PaymentReconciliationPaymentMethod | "";
  invoiceNumber?: string;
};

export type TransactionListParams = {
  offset: number;
  limit: number;
  ordering: string;
  created_date_after?: string;
  created_date_before?: string;
  outcome?: string;
  method?: string;
  invoice_number?: string;
};
