import { LocationRead } from "@/types/location";

const STORAGE_KEY_PREFIX = "pinelabs_last_used_terminal";

export type StoredTerminalSelection = {
  terminalId: string;
  location: LocationRead | null;
};

const storageKey = (facilityId: string) => `${STORAGE_KEY_PREFIX}:${facilityId}`;

export const getStoredTerminalSelection = (
  facilityId: string,
): StoredTerminalSelection | null => {
  try {
    const raw = sessionStorage.getItem(storageKey(facilityId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredTerminalSelection;
  } catch {
    return null;
  }
};

export const setStoredTerminalSelection = (
  facilityId: string,
  selection: StoredTerminalSelection,
) => {
  try {
    sessionStorage.setItem(storageKey(facilityId), JSON.stringify(selection));
  } catch {
    // Ignore storage errors (e.g. private browsing quota exceeded).
  }
};
