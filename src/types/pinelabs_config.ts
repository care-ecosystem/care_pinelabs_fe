import { User } from "@/types/user";

/**
 * Full Pinelabs Config response with all nested data
 */
// From your provided TypeScript file
export interface PinelabsConfigFull {
  id: string;
  facility_id: string;
  default_payment_flow: "pinelabs";
  allow_advance_payment: boolean;
  allow_partial_payment: boolean;
  pinelabs_merchant_id: string;
  payment_method_mappings: PaymentMethodMapping[];
  pos_terminals: PosTerminal[];
  created_by: User;
  updated_by: User;
  created_date: string;
  modified_date: string;
}

export interface PaymentMethodMapping {
  id: string;
  care_method: string;
  pinelabs_method: string;
  is_default: boolean;
  created_date: string;
  modified_date: string;
}

export interface PosTerminal {
  id: string;
  config_id: string;
  device: Device;
  created_by: User;
  updated_by: User;
  created_date: string;
  modified_date: string;
}

export interface Device {
  id: string;
  registered_name: string;
  care_type: "pos-terminal";
  metadata: {
    client_id?: string;
    store_id?: string;
  };
}

export interface CreatePinelabsConfigBody {
  facility_id: string;
  default_payment_flow: "pinelabs";
  allow_advance_payment: boolean;
  allow_partial_payment: boolean;
  pinelabs_merchant_id: string;
  pinelabs_security_token: string;
  payment_method_mappings: CreatePaymentMethodMapping[];
  pos_terminals?: CreatePosTerminal[];
}

export interface CreatePaymentMethodMapping {
  care_method: string;
  pinelabs_method: string;
  is_default: boolean;
}

export interface CreatePosTerminal {
  device_id: string;
}

export interface UpdatePinelabsConfigBody {
  default_payment_flow?: "pinelabs";
  allow_advance_payment?: boolean;
  allow_partial_payment?: boolean;
  pinelabs_merchant_id?: string;
  pinelabs_security_token?: string;
  payment_method_mappings?: UpdatePaymentMethodMapping[];
  pos_terminals?: CreatePosTerminal[];
}

export interface UpdatePaymentMethodMapping {
  id?: string; // Omit to create, include to update
  care_method: string;
  pinelabs_method: string;
  is_default: boolean;
}
