export type PinelabsTerminal = {
  id: string;
  facility_id: string;
  client_id: string;
  store_id: string;
  name: string;
  is_active: boolean;
  created_date: string;
  modified_date: string;
};

export type CreatePinelabsTerminalBody = {
  facility_id: string;
  client_id: string;
  store_id: string;
  name: string;
  is_active?: boolean;
};
