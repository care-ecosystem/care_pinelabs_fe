import { FC } from "react";

export type ShortcutBadgeProps = {
  label: string;
  className?: string;
};

// Mirrors the "keycap" look of care_fe's KeyboardShortcutBadge
// (src/Utils/keyboardShortcutComponents.tsx) so this plugin's shortcut hints
// look consistent with the host app, without depending on that module (it
// isn't exposed via module federation).
export const ShortcutBadge: FC<ShortcutBadgeProps> = ({ label, className }) => (
  <kbd
    className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded border border-gray-200 bg-linear-to-b from-white to-gray-200 px-1 text-xs font-medium text-gray-700 shadow-sm ${className ?? ""}`}
  >
    {label}
  </kbd>
);
