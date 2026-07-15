import { Account } from "@/types/account";
import { ChargeItem } from "@/types/charge_item";
import { MonetaryComponent } from "@/types/base";
import { PaymentReconciliation } from "@/types/payment_reconciliation";

export enum InvoiceStatus {
  draft = "draft",
  issued = "issued",
  balanced = "balanced",
  cancelled = "cancelled",
  entered_in_error = "entered_in_error",
}

export const INVOICE_CANCEL_REASONS = [
  InvoiceStatus.cancelled,
  InvoiceStatus.entered_in_error,
] as const;

export type Invoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  cancelled_reason?: (typeof INVOICE_CANCEL_REASONS)[number];
  payment_terms?: string;
  note?: string;
  issue_date?: string;
  account: Account;
  charge_items: ChargeItem[];
  total_price_components: MonetaryComponent[];
  total_net: number;
  total_gross: number;
  total_payments: string;
  payment_reconciliations?: PaymentReconciliation[];
};
