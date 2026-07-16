import { useEffect } from "react";

export type UseButtonShortcutOptions = {
  key: string;
  enabled?: boolean;
  onTrigger: () => void;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
};

export function useButtonShortcut({
  key,
  enabled = true,
  onTrigger,
}: UseButtonShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      event.preventDefault();
      onTrigger();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, enabled, onTrigger]);
}
