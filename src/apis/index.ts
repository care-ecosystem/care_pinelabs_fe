import {
  CancelTransactionRequest,
  PaymentReconciliationRead,
  TransactionStatusRequest,
  UploadTransactionRequest,
} from "@/types/gateway";
import {
  CreatePinelabsTerminalBody,
  PinelabsTerminal,
} from "@/types/pinelabs_terminal";
import { LocationRead } from "@/types/location";

import { PaginatedResponse } from "@/apis/types";
import { request, queryString } from "@/apis/request";

export const apis = {
  locations: {
    list: async (
      facilityId: string,
      params: {
        status?: string;
        mine?: boolean;
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
  pinelabs_terminals: {
    list: async (facilityId: string) => {
      return await request<PaginatedResponse<PinelabsTerminal>>(
        `/api/care_pinelabs/pinelabs_terminal/?facility=${facilityId}`,
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
  },
};
