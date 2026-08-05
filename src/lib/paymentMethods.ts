import { Banknote, CreditCard, QrCode, Smartphone, type LucideIcon } from "lucide-react";

import { PaymentReconciliationPaymentMethod } from "@/types/payment_reconciliation";

/**
 * Shared mapping of payment method enums to translation keys.
 * Single source of truth for all payment method labels.
 * Uses existing translation keys from public/locale/en.json
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PaymentReconciliationPaymentMethod.debc]: "payment_method_debit_card",
  [PaymentReconciliationPaymentMethod.ccca]: "payment_method_credit_card",
  [PaymentReconciliationPaymentMethod.cash]: "payment_method_cash_upi",
  [PaymentReconciliationPaymentMethod.ddpo]: "payment_method_bharat_qr",
  // [PaymentReconciliationPaymentMethod.cchk]: "payment_method_cchk",
  // [PaymentReconciliationPaymentMethod.cdac]: "payment_method_cdac",
  // [PaymentReconciliationPaymentMethod.chck]: "payment_method_chck",
};

export enum PinelabsPaymentModeEnum {
  CARD = "1",
  CASH = "2",
  UPI_SALE = "10",
  UPI_BHARAT_QR = "11",
}

export const PINELABS_PAYMENT_MODES = [
  { value: PinelabsPaymentModeEnum.CARD, labelKey: "pinelabs_payment_mode_card" },
  { value: PinelabsPaymentModeEnum.CASH, labelKey: "pinelabs_payment_mode_cash" },
  { value: PinelabsPaymentModeEnum.UPI_SALE, labelKey: "pinelabs_payment_mode_upi_sale" },
  { value: PinelabsPaymentModeEnum.UPI_BHARAT_QR, labelKey: "pinelabs_payment_mode_upi_bharat_qr" },
];


export const DEFAULT_PINELABS_PAYMENT_MODE_ICON: LucideIcon = CreditCard;

export const PINELABS_PAYMENT_MODE_ICONS: Record<string, LucideIcon> = {
  [PinelabsPaymentModeEnum.CARD]: CreditCard,
  [PinelabsPaymentModeEnum.CASH]: Banknote,
  [PinelabsPaymentModeEnum.UPI_SALE]: Smartphone,
  [PinelabsPaymentModeEnum.UPI_BHARAT_QR]: QrCode,
};

/**
 * Get all payment method options with their translation keys
 * Uses the existing PaymentReconciliationPaymentMethod enum
 * @returns Array of {value, labelKey} objects for use in dropdowns
 */
export const getPaymentMethodOptions = () => {
  return Object.values(PaymentReconciliationPaymentMethod).map((method) => ({
    value: method,
    labelKey: PAYMENT_METHOD_LABELS[method] || `payment_method_${method}`,
  }));
};

/**
 * Get the translation key for a payment method.
 * @param method - Payment method enum value
 * @returns Translation key (e.g., "payment_method_debit_card")
 */
export const getPaymentMethodLabelKey = (
  method: PaymentReconciliationPaymentMethod | string
): string => {
  return PAYMENT_METHOD_LABELS[method] || `payment_method_${method}`;
};

/**
 * Validate if a value is a valid payment method
 * @param value - The value to validate
 * @returns true if valid payment method, false otherwise
 */
export const isValidPaymentMethod = (
  value: string
): value is PaymentReconciliationPaymentMethod => {
  return Object.values(PaymentReconciliationPaymentMethod).includes(
    value as PaymentReconciliationPaymentMethod
  );
};

/**
 * Validate if a value is a valid Pinelabs payment mode
 * @param value - The value to validate
 * @returns true if valid Pinelabs payment mode, false otherwise
 */
export const isValidPinelabsPaymentMode = (
  value: string
): value is PinelabsPaymentModeEnum => {
  return Object.values(PinelabsPaymentModeEnum).includes(
    value as PinelabsPaymentModeEnum
  );
};