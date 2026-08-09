import { PaymentReconciliationStatus } from "@/types/payment_reconciliation";
import { PinelabsPaymentModeEnum } from "@/lib/paymentMethods";

export type TransactionFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  status?: PaymentReconciliationStatus | "";
  method?: PinelabsPaymentModeEnum | "";
  location?: string;
  terminal?: string;
  createdBy?: string;
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
  terminal?: string;
  created_by?: string;
};
