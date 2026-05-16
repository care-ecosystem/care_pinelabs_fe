export const I18NNAMESPACE = "care_pinelabs_fe";

function getNumberEnv(name: keyof ImportMetaEnv, fallback: number): number {
  const raw = import.meta.env?.[name];
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

export const DEFAULT_QR_CODE_EXPIRY_MS = getNumberEnv(
  "VITE_DEFAULT_QR_CODE_EXPIRY_MS",
  5 * 60 * 1000
); // 5 minutes

export const DEFAULT_PAYMENT_LINK_EXPIRY_MS = getNumberEnv(
  "VITE_DEFAULT_PAYMENT_LINK_EXPIRY_MS",
  60 * 60 * 1000
); // 1 hour
