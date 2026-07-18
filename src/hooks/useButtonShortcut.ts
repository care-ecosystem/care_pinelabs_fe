import { useEffect, useRef } from "react";

export type UseButtonShortcutOptions = {
  key: string;
  enabled?: boolean;
  onTrigger: () => void;
  shiftKey?: boolean;
};

/**
 * Custom hook for keyboard shortcuts on buttons.
 *
 * @param options - Configuration for the shortcut
 * @param options.key - The key to listen for (e.g., "Enter", "Escape")
 * @param options.enabled - Whether the shortcut is enabled (default: true)
 * @param options.onTrigger - Callback function to execute when shortcut is triggered
 * @param options.shiftKey - Whether Shift key must be pressed (default: false)
 *
 * @example
 * useButtonShortcut({
 *   key: "Enter",
 *   shiftKey: true,
 *   enabled: isFormValid,
 *   onTrigger: handleSubmit,
 * });
 */
export function useButtonShortcut({
  key,
  enabled = true,
  onTrigger,
  shiftKey = false,
}: UseButtonShortcutOptions) {
  // Store callback in ref to prevent re-attaching listener on every render
  const callbackRef = useRef(onTrigger);

  useEffect(() => {
    callbackRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Don't trigger when typing in input fields
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();

      // Check if shift key requirement is met
      const shiftMatches = shiftKey ? event.shiftKey : true;

      if (keyMatches && shiftMatches) {
        event.preventDefault();
        callbackRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, enabled, shiftKey]);
}
