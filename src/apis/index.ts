import {
  CancelTransactionRequest,
  PaymentReconciliationRead,
  RefreshTransactionStatusRequest,
  RefreshTransactionStatusResponse,
  TransactionStatusRequest,
  UploadTransactionRequest,
} from "@/types/gateway";
import {
  CreatePinelabsTerminalBody,
  PinelabsTerminal,
} from "@/types/pinelabs_terminal";
import { LocationRead } from "@/types/location";
import { PaymentReconciliation } from "@/types/payment_reconciliation";
import { User } from "@/types/user";
import { Invoice } from "@/types/invoice";

import { PaginatedResponse } from "@/apis/types";
import { request, queryString } from "@/apis/request";
import { Account } from "@/types/account";
import {
  PosTerminal,
  CreatePinelabsConfigBody,
  PinelabsConfigFull,
  UpdatePinelabsConfigBody,
} from "@/types/pinelabs_config";
import { Device, DeviceListParams } from "@/types/device";

export const apis = {
  invoices: {
    retrieve: async (facilityId: string, invoiceId: string) => {
      return await request<Invoice>(
        `/api/v1/facility/${facilityId}/invoice/${invoiceId}/`,
      );
    },
  },
  users: {
    list: async (
      facilityId: string,
      params: {
        limit?: number;
        offset?: number;
        search_text?: string;
      } = {},
      signal?: AbortSignal,
    ) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined),
      ) as Record<string, string | number>;

      return await request<PaginatedResponse<User>>(
        `/api/v1/facility/${facilityId}/users/${queryString(cleanParams)}`,
        { signal },
      );
    },
    get: async (facilityId: string, userId: string) => {
      return await request<User>(
        `/api/v1/facility/${facilityId}/users/${userId}/`,
      );
    },
    currentUser: async () => {
      return await request<User>(`/api/v1/users/getcurrentuser/`);
    },
  },
  locations: {
    list: async (
      facilityId: string,
      params: {
        status?: string;
        mine?: boolean;
        parent?: string;
        mode?: string;
        name?: string;
      } = {},
    ) => {
      const cleanParams = Object.fromEntries(
        Object.entries({ ordering: "sort_index", ...params }).filter(
          ([, value]) => value !== undefined,
        ),
      ) as Record<string, string | number | boolean>;

      return await request<PaginatedResponse<LocationRead>>(
        `/api/v1/facility/${facilityId}/location/${queryString(cleanParams)}`,
      );
    },
  },
  accounts: {
    retrieve: (facilityId: string, accountId: string) => {
      return request<Account>(
        `/api/v1/facility/${facilityId}/account/${accountId}/`,
      );
    },
  },
  pinelabs_terminals: {
    list: async (facilityId: string) => {
      return await request<PaginatedResponse<PinelabsTerminal>>(
        `/api/care_pinelabs/pinelabs_terminal/?facility=${facilityId}`,
      );
    },
    get: async (id: string) => {
      return await request<PinelabsTerminal>(
        `/api/care_pinelabs/pinelabs_terminal/${id}/`,
      );
    },
    create: async (data: CreatePinelabsTerminalBody) => {
      return await request<PinelabsTerminal>(
        "/api/care_pinelabs/pinelabs_terminal/",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
    update: async (id: string, data: Partial<CreatePinelabsTerminalBody>) => {
      return await request<PinelabsTerminal>(
        `/api/care_pinelabs/pinelabs_terminal/${id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
    },
    delete: async (id: string) => {
      return await request<void>(
        `/api/care_pinelabs/pinelabs_terminal/${id}/`,
        {
          method: "DELETE",
        },
      );
    },
  },
  pinelabs_config: {

    get: async (facilityId: string) => {
      return await request<PinelabsConfigFull>(
        `/api/care_pinelabs/pinelabs_config/?facility_id=${facilityId}`,
      );
    },
    create: async (data: CreatePinelabsConfigBody) => {
      return await request<PinelabsConfigFull>(
        `/api/care_pinelabs/pinelabs_config/`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },

    update: async (configId: string, data: UpdatePinelabsConfigBody) => {
      return await request<PinelabsConfigFull>(
        `/api/care_pinelabs/pinelabs_config/${configId}/`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
    },

    getTerminals: async (configId: string, mine: boolean = false) => {
      return await request<PosTerminal[]>(
        `/api/care_pinelabs/pinelabs_config/${configId}/pos-terminals/?mine=${mine}`,
      );
    },
    linkTerminals: async (configId: string, terminalDeviceIds: string[]) => {
      return await request<PinelabsConfigFull>(
        `/api/care_pinelabs/pinelabs_config/${configId}/pos-terminals/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            pos_terminals: terminalDeviceIds.map((device_id) => ({
              device_id,
            })),
          }),
        },
      );
    },
  },

  gateway: {
    upload_transaction: async (data: UploadTransactionRequest) => {
      return await request<PaymentReconciliationRead>(
        "/api/care_pinelabs/gateway/upload_transaction/",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
    transaction_status: async (data: TransactionStatusRequest) => {
      return await request<PaymentReconciliationRead>(
        "/api/care_pinelabs/gateway/transaction_status/",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
    cancel_transaction: async (data: CancelTransactionRequest) => {
      return await request<PaymentReconciliationRead>(
        "/api/care_pinelabs/gateway/cancel_transaction/",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
    refresh_transaction_status: async (
      data: RefreshTransactionStatusRequest,
    ) => {
      return await request<RefreshTransactionStatusResponse>(
        "/api/care_pinelabs/gateway/refresh_transaction_status/",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
  },
  devices: {
    list: async (
      facilityId: string,
      params: DeviceListParams = {},
      signal?: AbortSignal,
    ) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        ),
      ) as Record<string, string | number>;

      return await request<PaginatedResponse<Device>>(
        `/api/v1/facility/${facilityId}/device/${queryString(cleanParams)}`,
        { signal },
      );
    },
    retrieve: async (facilityId: string, deviceId: string) => {
      return await request<Device>(
        `/api/v1/facility/${facilityId}/device/${deviceId}/`,
      );
    },
  },
  payment_reconciliations: {
    list: async (
      facilityId: string,
      params?: {
        offset?: number;
        limit?: number;
        ordering?: string;
        created_date_after?: string;
        created_date_before?: string;
        status?: string;
        method?: string;
        location?: string;
        created_by?: string;
      },
    ) => {
      const cleanParams = Object.fromEntries(
        Object.entries({
          limit: 20,
          offset: 0,
          ordering: "-modified_date",
          ...params,
        }).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        ),
      ) as Record<string, string | number>;

      return await request<PaginatedResponse<PaymentReconciliation>>(
        `/api/v1/facility/${facilityId}/payment_reconciliation/${queryString(cleanParams)}`,
      );
    },
  },
};
