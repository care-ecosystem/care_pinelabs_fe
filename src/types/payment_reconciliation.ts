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

export enum PaymentReconciliationOutcome {
  queued = "queued",
  complete = "complete",
  error = "error",
  partial = "partial",
}

export enum PaymentReconciliationPaymentMethod {
  cash = "cash",
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
  outcome: PaymentReconciliationOutcome;
  disposition?: string;
  created_date?: string;
  payment_datetime?: string;
  method: PaymentReconciliationPaymentMethod;
  reference_number?: string;
  authorization?: string;
  tendered_amount?: string;
  returned_amount?: string;
  note?: string;
  amount: string;
  target_invoice: Invoice;
  account: Account;
  is_credit_note: boolean;
};
