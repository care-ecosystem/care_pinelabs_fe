import { PaymentReconciliationPaymentMethod } from "@/types/payment_reconciliation";

/**
 * Shared mapping of payment method enums to translation keys.
 * Single source of truth for all payment method labels.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PaymentReconciliationPaymentMethod.debc]: "payment_method_debit_card",
  [PaymentReconciliationPaymentMethod.ccca]: "payment_method_credit_card",
  [PaymentReconciliationPaymentMethod.cash]: "payment_method_cash_upi",
  [PaymentReconciliationPaymentMethod.ddpo]: "payment_method_bharat_qr",
};

/**
 * Get the translation key for a payment method.
 * @param method - Payment method enum value
 * @returns Translation key (e.g., "payment_method_debit_card")
 */
export const getPaymentMethodLabel = (method: string): string => {
  return PAYMENT_METHOD_LABELS[method] || method.toUpperCase();
};
