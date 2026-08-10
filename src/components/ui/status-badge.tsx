import { FC, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeColor =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "caution";

export const STATUS_BADGE_COLOR_CLASSES: Record<StatusBadgeColor, string> = {
  success: "border-primary-300 bg-primary-100 text-primary-900",
  warning: "border-gray-300 bg-gray-100 text-gray-900",
  danger: "border-red-300 bg-red-100 text-red-900",
  info: "border-blue-300 bg-blue-100 text-blue-900",
  caution: "border-amber-300 bg-amber-100 text-amber-900",
};

type StatusBadgeProps = {
  color: StatusBadgeColor;
  className?: string;
  children: ReactNode;
};

export const StatusBadge: FC<StatusBadgeProps> = ({
  color,
  className,
  children,
}) => (
  <Badge
    className={cn(
      "rounded-md border px-2.5 py-px text-sm font-medium",
      STATUS_BADGE_COLOR_CLASSES[color],
      className,
    )}
  >
    {children}
  </Badge>
);
