import { FC } from "react";

export type ShortcutBadgeProps = {
  shortcut: string;
  variant?: "default" | "primary";
};

/**
 * Visual badge component displaying keyboard shortcuts.
 *
 * @param shortcut - The keyboard shortcut to display (e.g., "ESC", "⇧ ↵")
 * @param variant - Visual style variant
 *
 * @example
 * <ShortcutBadge shortcut="ESC" variant="default" />
 * <ShortcutBadge shortcut="⇧ ↵" variant="primary" />
 */
export const ShortcutBadge: FC<ShortcutBadgeProps> = ({
  shortcut,
  variant = "default",
}) => {
  const baseClasses =
    "hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium";

  const variantClasses =
    variant === "primary"
      ? "border-primary-300 bg-primary-100 text-primary-700"
      : "border-gray-300 bg-gray-50 text-gray-600";

  return <kbd className={`${baseClasses} ${variantClasses}`}>{shortcut}</kbd>;
};
