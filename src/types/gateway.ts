import {
  PaymentReconciliation,
  PaymentReconciliationIssuerType,
  PaymentReconciliationKind,
  PaymentReconciliationPaymentMethod,
  PaymentReconciliationType,
} from "@/types/payment_reconciliation";

export enum PaymentMode {
  CARD = "1",
  UPI = "10",
  BHARAT_QR = "11",
}

export type UploadTransactionRequest = {
  terminal: string;
  payment_mode?: PaymentMode;

  reconciliation_type: PaymentReconciliationType;
  kind: PaymentReconciliationKind;
  issuer_type: PaymentReconciliationIssuerType;
  method: PaymentReconciliationPaymentMethod;
  tendered_amount: string;
  returned_amount: string;
  is_credit_note?: boolean;
  account: string;
  target_invoice?: string | null;
  location?: string | null;
  disposition?: string | null;
  note?: string | null;
};

export type TransactionStatusRequest = {
  payment_reconciliation: string;
};

export type CancelTransactionRequest = {
  payment_reconciliation: string;
};

export type RefreshTransactionStatusRequest = {
  payment_reconciliation: string;
};

export type RefreshTransactionStatusResponse = {
  status_changed: boolean;
  payment_reconciliation: PaymentReconciliation;
};

export type PaymentReconciliationRead = PaymentReconciliation;

export type PinelabsErrorEntry = {
  type: string;
  msg: string;
  code?: number;
  loc?: Array<string | number>;
  input?: unknown;
};

export type PinelabsErrorEnvelope =
  | { errors: PinelabsErrorEntry[] }
  | { detail: string };
