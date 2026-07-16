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
// Includes fields for both Card and UPI/Bharat QR transactions
export const TRANSACTION_DATA_FIELDS = [
  "MID",
  "TID",
  "RRN",
  "Amount",
  "FinalAmount",
  "PaymentMode",
  "ApprovalCode",
  "Acquirer Name",
  "Acquirer Id",
  "BatchNumber",
  "Invoice Number",
  "Transaction Date",
  "Transaction Time",
  "TransactionLogId",
  "AmountInPaisa",
  "OriginalAmount",
  // Card-specific fields (only shown for card transactions)
  "Card Type",
  "Card Number",
  "Expiry Date",
  "Card Holder Name",
  // UPI/Bharat QR specific fields (only shown for UPI transactions)
  "Customer VPA",
] as const;

// Fields to display from the Upload object
export const UPLOAD_FIELDS = [
  "response_code",
  "response_message",
] as const;

// Fields to display from the main Pinelabs object (use actual snake_case keys)
export const PINELABS_FIELDS = [
  "terminal_id",
  "payment_mode",
  "transaction_number",
  "transaction_reference_id",
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
