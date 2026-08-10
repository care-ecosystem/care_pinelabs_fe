export interface DeviceLocation {
  id: string;
  name: string;
  status: string;
  operational_status?: string;
}

export interface DeviceCareMetadata {
  store_id?: string;
  client_id?: string;
  terminal_name?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface Device {
  id: string;
  identifier: string | null;
  status: "active" | "inactive";
  availability_status: string;
  manufacturer: string;
  manufacture_date: string | null;
  expiration_date: string | null;
  lot_number: string | null;
  serial_number: string | null;
  registered_name: string;
  user_friendly_name: string | null;
  model_number: string | null;
  part_number: string | null;
  // Opaque blobs this plugin never reads beyond passing through - kept as
  // `unknown` rather than modeled, since the shapes aren't otherwise needed.
  contact: Record<string, unknown>;
  care_type: string; // e.g., "pos-terminal"
  care_metadata?: DeviceCareMetadata;
  current_location?: DeviceLocation;
  current_encounter: unknown;
  created_by?: unknown;
  updated_by?: unknown;
  managing_organization: unknown;
}

export interface DeviceListParams {
  care_type?: string;
  limit?: number;
  offset?: number;
  status?: string;
  search_text?: string;
}