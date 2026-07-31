import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  isBefore,
  isSameDay,
  parse,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { I18NNAMESPACE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DateRangeOption = {
  label: string;
  getDateRange: () => { from: Date; to: Date };
  count?: number;
};

export const presetOptions: DateRangeOption[] = [
  {
    label: "today",
    getDateRange: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: "yesterday",
    getDateRange: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
  },
  {
    label: "last_count_days",
    getDateRange: () => ({ from: subDays(new Date(), 7), to: new Date() }),
    count: 7,
  },
  {
    label: "last_count_weeks",
    getDateRange: () => ({ from: subWeeks(new Date(), 3), to: new Date() }),
    count: 3,
  },
  {
    label: "last_month",
    getDateRange: () => ({ from: subMonths(new Date(), 1), to: new Date() }),
  },
  {
    label: "last_count_months",
    getDateRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
    count: 3,
  },
  {
    label: "last_count_months",
    getDateRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }),
    count: 6,
  },
  {
    label: "last_year",
    getDateRange: () => ({ from: subYears(new Date(), 1), to: new Date() }),
  },
];

const parseLocalDateInput = (value: string): Date | undefined =>
  value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

type DateRangeFilterProps = {
  dateFrom?: Date;
  dateTo?: Date;
  onChange: (range: { dateFrom?: Date; dateTo?: Date }) => void;
  onCommit?: () => void;
};

// Inline content (no self-contained Popover/trigger) - meant to be rendered
// directly inside an already-open filter popover/editor pane, matching
// care_fe's RenderDateFilter which replaces the current popover's content
// in place rather than opening a second nested popover.
export const DateRangeFilter: FC<DateRangeFilterProps> = ({
  dateFrom,
  dateTo,
  onChange,
  onCommit,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [view, setView] = useState<"options" | "custom">("options");
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>(dateFrom);
  const [pendingTo, setPendingTo] = useState<Date | undefined>(dateTo);

  const isSameRange = (option: DateRangeOption) => {
    if (!dateFrom || !dateTo) return false;
    const { from, to } = option.getDateRange();
    return isSameDay(dateFrom, from) && isSameDay(dateTo, to);
  };

  const matchedPreset = presetOptions.find((option) => isSameRange(option));

  const handlePresetSelect = (option: DateRangeOption) => {
    const { from, to } = option.getDateRange();
    onChange({ dateFrom: from, dateTo: to });
    onCommit?.();
  };

  const handleConfirm = () => {
    onChange({ dateFrom: pendingFrom, dateTo: pendingTo });
    setView("options");
    onCommit?.();
  };

  if (view === "custom") {
    return (
      <>
        <div className="flex items-center gap-2 border-b border-gray-200 p-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setView("options")}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-950">
            {t("custom_date_range")}
          </span>
        </div>
        <div className="w-full flex flex-col max-h-[30vh] overflow-y-auto">
          <Calendar
            mode="range"
            selected={{ from: pendingFrom, to: pendingTo }}
            onSelect={(range) => {
              setPendingFrom(range?.from);
              setPendingTo(range?.to);
            }}
            styles={{
              day: {
                width: "40px",
              },
              weekdays: {
                width: "100%",
                justifyContent: "space-between",
              },
              nav: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                padding: "0.5rem",
              },
            }}
            className="w-full"
            captionLayout="label"
            endMonth={new Date(2100, 11, 31)}
            monthCaptionClassName="self-center"
            rangeMiddleClassName="bg-primary/10 [&>button]:rounded-md"
          />
          <div className="my-2 border-t border-gray-200" />
          <div className="flex flex-col gap-2 p-3 pt-0">
            <div>
              <label
                htmlFor="date-range-filter-from"
                className="text-sm text-gray-600 mb-1 block capitalize"
              >
                {t("from")}
              </label>
              <Input
                id="date-range-filter-from"
                type="date"
                value={pendingFrom ? format(pendingFrom, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setPendingFrom(parseLocalDateInput(e.target.value))
                }
                className="flex flex-col justify-between text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="date-range-filter-to"
                className="text-sm text-gray-600 mb-1 block capitalize"
              >
                {t("to")}
              </label>
              <Input
                id="date-range-filter-to"
                type="date"
                value={pendingTo ? format(pendingTo, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setPendingTo(parseLocalDateInput(e.target.value))
                }
                className="flex flex-col justify-between text-sm"
              />
            </div>
          </div>
        </div>
        <div className="px-3 p-2">
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={handleConfirm}
            disabled={
              (!pendingFrom && !pendingTo) ||
              !!(pendingFrom && pendingTo && isBefore(pendingTo, pendingFrom))
            }
          >
            {t("confirm")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2 max-h-[30vh] overflow-y-auto">
      {presetOptions.map((option, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handlePresetSelect(option)}
          className={cn(
            "w-full text-left rounded-md px-3 py-2 font-medium text-sm text-gray-950 hover:bg-gray-100",
            isSameRange(option) && "bg-gray-100 border border-green-500",
          )}
        >
          {option.count
            ? t(option.label, { count: option.count })
            : t(option.label)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          setPendingFrom(dateFrom);
          setPendingTo(dateTo);
          setView("custom");
        }}
        className={cn(
          "w-full flex items-center justify-between rounded-md px-3 py-2 font-medium text-sm text-gray-950 hover:bg-gray-100",
          !matchedPreset &&
            (dateFrom || dateTo) &&
            "bg-gray-100 border border-green-500",
        )}
      >
        {t("custom_date_range")}
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
