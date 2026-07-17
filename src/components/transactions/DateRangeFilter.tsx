import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  isBefore,
  isSameDay,
  isValid,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { I18NNAMESPACE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangeOption = {
  label: string;
  getDateRange: () => { from: Date; to: Date };
  count?: number;
};

const presetOptions: DateRangeOption[] = [
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

type DateRangeFilterProps = {
  dateFrom?: Date;
  dateTo?: Date;
  onChange: (range: { dateFrom?: Date; dateTo?: Date }) => void;
};

export const DateRangeFilter: FC<DateRangeFilterProps> = ({
  dateFrom,
  dateTo,
  onChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"options" | "custom">("options");
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>(dateFrom);
  const [pendingTo, setPendingTo] = useState<Date | undefined>(dateTo);

  const hasValidFrom = !!dateFrom && isValid(dateFrom);
  const hasValidTo = !!dateTo && isValid(dateTo);
  const isSameDate = !!dateFrom && !!dateTo && isSameDay(dateFrom, dateTo);
  const presentDate = isSameDate ? dateFrom : dateFrom || dateTo;

  const isSameRange = (option: DateRangeOption) => {
    if (!dateFrom || !dateTo) return false;
    const { from, to } = option.getDateRange();
    return isSameDay(dateFrom, from) && isSameDay(dateTo, to);
  };

  const matchedPreset = presetOptions.find((option) => isSameRange(option));

  const label = matchedPreset
    ? t(matchedPreset.label, { count: matchedPreset.count })
    : !hasValidFrom && !hasValidTo
      ? t("select_date_range")
      : dateFrom && dateTo && !isSameDate
        ? (() => {
            const needsYear = dateFrom.getFullYear() !== dateTo.getFullYear();
            return `${format(dateFrom, needsYear ? "d MMM yy" : "d MMM")} - ${format(
              dateTo,
              needsYear ? "d MMM yy" : "d MMM",
            )}`;
          })()
        : presentDate
          ? format(presentDate, "d MMM yyyy")
          : t("select_date_range");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setPendingFrom(dateFrom);
      setPendingTo(dateTo);
      setView("options");
    }
    setOpen(isOpen);
  };

  const handlePresetSelect = (option: DateRangeOption) => {
    const { from, to } = option.getDateRange();
    onChange({ dateFrom: from, dateTo: to });
    setOpen(false);
  };

  const handleConfirm = () => {
    onChange({ dateFrom: pendingFrom, dateTo: pendingTo });
    setOpen(false);
    setView("options");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateFrom && !dateTo && "text-gray-500",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        {view === "options" ? (
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
              onClick={() => setView("custom")}
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
        ) : (
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
                captionLayout="dropdown"
                endMonth={new Date(2100, 11, 31)}
                monthCaptionClassName="self-center"
                rangeMiddleClassName="bg-primary/10 [&>button]:rounded-md"
              />
              <div className="my-2 border-t border-gray-200" />
              <div className="flex flex-col gap-2 p-3 pt-0">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block capitalize">
                    {t("from")}
                  </label>
                  <Input
                    type="date"
                    value={pendingFrom ? format(pendingFrom, "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      setPendingFrom(
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
                    }
                    className="flex flex-col justify-between text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block capitalize">
                    {t("to")}
                  </label>
                  <Input
                    type="date"
                    value={pendingTo ? format(pendingTo, "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      setPendingTo(
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
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
                  !!(
                    pendingFrom &&
                    pendingTo &&
                    isBefore(pendingTo, pendingFrom)
                  )
                }
              >
                {t("confirm")}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
