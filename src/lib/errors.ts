import { APIError } from "@/apis/request";
import { PinelabsErrorEntry, PinelabsErrorEnvelope } from "@/types/gateway";
import { Device } from "@/types/device";

const FRIENDLY_BY_TYPE: Record<string, (entry: PinelabsErrorEntry) => string> =
  {
    pinelabs_upload_failed: (e) => `Couldn't reach the terminal: ${e.msg}`,
    pinelabs_cancel_failed: (e) => `Couldn't cancel on the terminal: ${e.msg}`,
    pinelabs_metadata_missing: () =>
      "This payment wasn't initiated via Pinelabs",
    object_not_found: () => "Payment record not found",
  };

const isErrorsEnvelope = (
  data: unknown,
): data is { errors: PinelabsErrorEntry[] } => {
  if (!data || typeof data !== "object") return false;
  const maybe = data as { errors?: unknown };
  return Array.isArray(maybe.errors);
};

const isDetailEnvelope = (data: unknown): data is { detail: string } => {
  if (!data || typeof data !== "object") return false;
  const maybe = data as { detail?: unknown };
  return typeof maybe.detail === "string";
};

// Handles both the standard `{errors: [{type, msg, code?}]}` envelope and the
// DRF-style `{detail: "..."}` shape used for permission errors.
export const getPinelabsErrorMessage = (
  error: unknown,
  fallback = "Something went wrong",
): string => {
  if (error instanceof APIError) {
    const data = error.data as PinelabsErrorEnvelope | undefined;

    if (isErrorsEnvelope(data) && data.errors.length > 0) {
      const first = data.errors[0];
      const friendly = FRIENDLY_BY_TYPE[first.type];
      if (friendly) return friendly(first);
      return first.msg || fallback;
    }

    if (isDetailEnvelope(data)) {
      return data.detail;
    }

    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

export const getPinelabsErrorType = (error: unknown): string | undefined => {
  if (!(error instanceof APIError)) return undefined;
  const data = error.data as PinelabsErrorEnvelope | undefined;
  if (isErrorsEnvelope(data) && data.errors.length > 0) {
    return data.errors[0].type;
  }
  return undefined;
};

export const validateTerminalOnSubmit = (
  device: Device | null,
): string | null => {
  if (!device) {
    return "Please select a terminal";
  }

  if (!device.current_location || !device.current_location.id) {
    return "Terminal does not have a location associated. Please associate this terminal to a location first.";
  }

  if (
    !device.care_metadata?.store_id ||
    device.care_metadata.store_id.trim() === ""
  ) {
    return "Terminal configuration is incomplete: Store ID is missing. Please configure this terminal with a Store ID.";
  }

  if (
    !device.care_metadata?.client_id ||
    device.care_metadata.client_id.trim() === ""
  ) {
    return "Terminal configuration is incomplete: Client ID is missing. Please configure this terminal with a Client ID.";
  }

  return null;
};
