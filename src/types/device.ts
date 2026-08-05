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
  [key: string]: any;
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
  contact: Record<string, any>;
  care_type: string; // e.g., "pos-terminal"
  care_metadata?: DeviceCareMetadata;
  current_location?: DeviceLocation;
  current_encounter: any;
  created_by?: any;
  updated_by?: any;
  managing_organization: any;
}

export interface DeviceListParams {
  care_type?: string;
  limit?: number;
  offset?: number;
  status?: string;
  search_text?: string;
}