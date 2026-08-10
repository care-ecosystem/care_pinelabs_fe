import { Account } from "@/types/account";
import { Invoice } from "@/types/invoice";

export enum PaymentReconciliationType {
  payment = "payment",
  adjustment = "adjustment",
  advance = "advance",
}

export enum PaymentReconciliationStatus {
  active = "active",
  cancelled = "cancelled",
  draft = "draft",
  entered_in_error = "entered_in_error",
}
// export enum PaymentReconciliationOutcome {
//   active = "active",
//   cancelled = "cancelled",
//   draft = "draft",
//   entered_in_error = "entered_in_error",
// }

export enum PaymentReconciliationKind {
  deposit = "deposit",
  preriodic_payment = "preriodic_payment",
  online = "online",
  kiosk = "kiosk",
}

export enum PaymentReconciliationIssuerType {
  patient = "patient",
  insurance = "insurance",
}

export enum PaymentReconciliationStatus {
  started = "started",
  in_progress = "in_progress",
  completed = "completed",
  failed = "failed",
  partial = "partial",
  timeout = "timeout",
}

export enum PaymentReconciliationPaymentMethod {
  // cash = "cash",
  ccca = "ccca",
  cchk = "cchk",
  cdac = "cdac",
  chck = "chck",
  ddpo = "ddpo",
  debc = "debc",
}

export type PaymentReconciliation = {
  id: string;
  reconciliation_type: PaymentReconciliationType;
  status: PaymentReconciliationStatus;
  kind: PaymentReconciliationKind;
  issuer_type: PaymentReconciliationIssuerType;
  outcome: PaymentReconciliationStatus;
  
  disposition?: string;
  created_date?: string;
  modified_date?: string;
  method: PaymentReconciliationPaymentMethod;
  transaction_id?: string;
  transaction_number?: string;
  payment_reconciliation?: string;
  authorization?: string;
  tendered_amount?: string;
  returned_amount?: string;
  note?: string;
  amount: string;
  target_invoice: Invoice;
  account: Account;
  is_credit_note: boolean;
  meta?: {
    pinelabs?: Record<string, unknown>;
    terminal_id?: string
  };
};
