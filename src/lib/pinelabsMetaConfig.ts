/**
 * Configuration for displaying Pinelabs transaction metadata
 */

// Payment Mode enum mapping
export const PAYMENT_MODE_LABELS: Record<string, string> = {
  "0": "All modes enabled on the Plutus terminal",
  "1": "Card",
  "2": "Cash",
  "3": "Points",
  "4": "Wallets",
  "6": "Brand EMI",
  "7": "Sodexo",
  "8": "PhonePe",
  "10": "UPI Sale",
  "11": "UPI Bharat QR",
  "12": "Airtel Bank",
  "20": "Bank EMI",
  "21": "Amazon Pay via Mobile No., QR and Barcode",
  "22": "Sale with/Without Instant Discount",
};

// Fields to display from the Status object
export const STATUS_FIELDS = [
  "response_code",
  "response_message",
] as const;

// Fields to display from the Status.transaction_data object
export const TRANSACTION_DATA_FIELDS = [
  "MID",
  "TID",
  "RRN",
  "Amount",
  "FinalAmount",
  "Card Type",
  "Card Number",
  "Expiry Date",
  "PaymentMode",
  "ApprovalCode",
  "Acquirer Name",
  "Invoice Number",
  "Card Holder Name",
  "Transaction Date",
  "Transaction Time",
  "TransactionLogId",
] as const;

// Fields to display from the Upload object
export const UPLOAD_FIELDS = [
  "response_code",
  "response_message",
] as const;

// Fields to display from the main Pinelabs object
export const PINELABS_FIELDS = [
  "Terminal Id",
  "Payment Mode",
  "Transaction Number",
  "Transaction Reference Id",
] as const;

// Order of sections to display
export const SECTION_ORDER = [
  "pinelabs",
  "status",
  "upload",
] as const;

export type StatusField = (typeof STATUS_FIELDS)[number];
export type TransactionDataField = (typeof TRANSACTION_DATA_FIELDS)[number];
export type UploadField = (typeof UPLOAD_FIELDS)[number];
export type PinelabsField = (typeof PINELABS_FIELDS)[number];
