import { FC, useState, useEffect, ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isSameDay } from "date-fns";
import {
  DateRangeFilter,
  presetOptions,
} from "@/components/transactions/DateRangeFilter";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import {
  PaymentReconciliationStatus,
  PaymentReconciliationPaymentMethod,
} from "@/types/payment_reconciliation";
import {
  XIcon,
  Loader2Icon,
  ListFilterIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { LocationTypeIcons } from "@/types/location";
import { UserSelector } from "@/components/transactions/UserSelector";
import { User } from "@/types/user";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/dayjs";

type FilterOption = {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  color?: string;
};

// Mirrors care_fe's GenericFilter: a search input + a radio list below it,
// instead of a native/shadcn Select dropdown. Clicking the already-selected
// option clears it (same interaction care_fe uses instead of an "All" item).
// Owns its own search state so independently-opened editors (e.g. status and
// location popovers open at the same time) don't share query text.
const FilterOptionsList: FC<{
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  isLoadingOptions?: boolean;
}> = ({ options, selectedValue, onSelect, isLoadingOptions }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [search, setSearch] = useState("");
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-0">
      <div className="p-3 border-b">
        <Input
          placeholder={t("search_options")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-base sm:text-sm"
        />
      </div>
      <div className="p-3 max-h-[30vh] overflow-y-auto">
        {isLoadingOptions ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2Icon className="size-4 animate-spin" />
            <p className="text-sm text-gray-600">{t("loading")}</p>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {t("no_results_found")}
          </div>
        ) : (
          <RadioGroup
            value={selectedValue}
            onValueChange={onSelect}
            className="flex flex-col gap-1"
          >
            {filteredOptions.map((option) => {
              const Icon = option.icon;
              const optionId = `filter-option-${option.value}`;
              return (
                <label
                  key={option.value}
                  htmlFor={optionId}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem
                    id={optionId}
                    value={option.value}
                    onClick={() => {
                      if (selectedValue === option.value) onSelect("");
                    }}
                  />
                  {option.color && (
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full shrink-0 border",
                        option.color,
                      )}
                    />
                  )}
                  {Icon && <Icon className="h-4 w-4 text-gray-500 shrink-0" />}
                  <span className="text-sm text-gray-700 flex-1">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        )}
      </div>
    </div>
  );
};

type TransactionFiltersProps = {
  facilityId: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  [PaymentReconciliationStatus.active]: "status_completed",
  [PaymentReconciliationStatus.draft]: "status_pending",
  [PaymentReconciliationStatus.cancelled]: "status_cancelled",
};

// Matches care_fe's PAYMENT_RECONCILIATION_STATUS_COLORS -> getVariantColorClasses
// mapping exactly: active=primary, draft=secondary (gray), cancelled=destructive.
const STATUS_PILL_CLASSES: Record<string, string> = {
  [PaymentReconciliationStatus.active]:
    "border-primary-300 bg-primary-100 text-primary-900",
  [PaymentReconciliationStatus.draft]:
    "border-gray-300 bg-gray-100 text-gray-900",
  [PaymentReconciliationStatus.cancelled]:
    "border-red-300 bg-red-100 text-red-900",
};

const STATUS_DOT_CLASSES = STATUS_PILL_CLASSES;

export const TransactionFilters: FC<TransactionFiltersProps> = ({
  facilityId,
  filters,
  onFiltersChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilterState] = useState<string | null>(null);
  const [openChip, setOpenChip] = useState<string | null>(null);
  // Bumped every time the date editor is (re)opened, forcing DateRangeFilter
  // to remount so its internal view/pending-range state doesn't go stale
  // between openings.
  const [dateEditorKey, setDateEditorKey] = useState(0);

  const setActiveFilter = (key: string | null) => {
    if (key === "date") setDateEditorKey((k) => k + 1);
    setActiveFilterState(key);
  };

  const closeFilterPopovers = () => {
    setOpen(false);
    setActiveFilterState(null);
    setOpenChip(null);
  };

  const { data: locationsResponse, isLoading: isLocationsLoading } = useQuery({
    queryKey: ["pinelabs_locations", facilityId],
    queryFn: () =>
      apis.locations.list(facilityId, {
        status: "active",
        mine: true,
      }),
    enabled: !!facilityId,
  });

  const locations = locationsResponse?.results || [];
  const selectedLocation = locations.find((l) => l.id === filters.location);

  // Resolve the selected user's display info (name/avatar) from the URL on
  // refresh - the API has no lookup-by-id endpoint, so we persist the
  // username too and fetch by that instead.
  const { data: resolvedUser } = useQuery({
    queryKey: ["pinelabs_user", filters.createdByUsername],
    queryFn: () => apis.users.get(filters.createdByUsername as string),
    enabled:
      !!filters.createdByUsername && selectedUser?.id !== filters.createdBy,
  });

  useEffect(() => {
    if (resolvedUser) setSelectedUser(resolvedUser);
  }, [resolvedUser]);

  useEffect(() => {
    if (selectedUser && selectedUser.id !== filters.createdBy) {
      setSelectedUser(undefined);
    }
  }, [filters.createdBy, selectedUser]);

  const handleClearFilters = () => {
    setSelectedUser(undefined);
    onFiltersChange({
      ...filters,
      dateFrom: undefined,
      dateTo: undefined,
      status: "",
      location: "",
      createdBy: "",
      createdByUsername: "",
    });
  };

  const handleClearOne = (key: string) => {
    if (key === "date") {
      onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined });
    } else if (key === "status") {
      onFiltersChange({ ...filters, status: "" });
    } else if (key === "location") {
      onFiltersChange({ ...filters, location: "" });
    }
  };

  // Matches care_fe's SelectedDateBadge: show the preset's own label (e.g.
  // "Today") when the selected range matches one, else the formatted range.
  const matchedDatePreset = presetOptions.find((option) => {
    if (!filters.dateFrom || !filters.dateTo) return false;
    const { from, to } = option.getDateRange();
    return isSameDay(filters.dateFrom, from) && isSameDay(filters.dateTo, to);
  });

  const dateSummary = matchedDatePreset
    ? t(matchedDatePreset.label, { count: matchedDatePreset.count })
    : [filters.dateFrom, filters.dateTo]
        .filter(Boolean)
        .map((d) => dayjs(d).format("MMM D, YYYY"))
        .join(" - ");

  const FILTER_FIELDS = [
    {
      key: "date",
      label: t("date"),
      active: !!(filters.dateFrom || filters.dateTo),
      summary: dateSummary,
    },
    {
      key: "status",
      label: t("status"),
      active: !!filters.status,
      summary: filters.status ? t(STATUS_LABEL_KEYS[filters.status]) : "",
    },
    {
      key: "location",
      label: t("location"),
      active: !!filters.location,
      summary: selectedLocation?.name || "",
    },
  ];

  const activeCount = FILTER_FIELDS.filter((f) => f.active).length;
  const totalActiveCount = activeCount + (filters.createdBy ? 1 : 0);

  const STATUS_OPTIONS: FilterOption[] = [
    {
      value: PaymentReconciliationStatus.active,
      label: t("status_completed"),
      color: STATUS_DOT_CLASSES[PaymentReconciliationStatus.active],
    },
    {
      value: PaymentReconciliationStatus.draft,
      label: t("status_pending"),
      color: STATUS_DOT_CLASSES[PaymentReconciliationStatus.draft],
    },
    {
      value: PaymentReconciliationStatus.cancelled,
      label: t("status_cancelled"),
      color: STATUS_DOT_CLASSES[PaymentReconciliationStatus.cancelled],
    },
  ];

  const LOCATION_OPTIONS: FilterOption[] = locations.map((location) => ({
    value: location.id,
    label: location.name,
    icon: LocationTypeIcons[location.form],
  }));

  const renderEditor = (key: string) => {
    switch (key) {
      case "date":
        return (
          <DateRangeFilter
            key={dateEditorKey}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={({ dateFrom, dateTo }) =>
              onFiltersChange({ ...filters, dateFrom, dateTo })
            }
            onCommit={closeFilterPopovers}
          />
        );
      case "status":
        return (
          <FilterOptionsList
            options={STATUS_OPTIONS}
            selectedValue={filters.status || ""}
            onSelect={(value) =>
              onFiltersChange({
                ...filters,
                status: value as PaymentReconciliationStatus,
              })
            }
          />
        );
      case "location":
        return (
          <FilterOptionsList
            options={LOCATION_OPTIONS}
            selectedValue={filters.location || ""}
            onSelect={(value) => onFiltersChange({ ...filters, location: value })}
            isLoadingOptions={isLocationsLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
      {/* Payment method - mandatory, kept outside the clubbed popover */}
      <div className="w-full sm:w-64">
        <Select
          value={filters.method || PaymentReconciliationPaymentMethod.ddpo}
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              method: value as PaymentReconciliationPaymentMethod,
            });
          }}
        >
          <SelectTrigger className="w-full" aria-label={t("payment_method")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PaymentReconciliationPaymentMethod.ddpo}>
              {t("payment_method_upi")} / {t("payment_method_bharat_qr")}
            </SelectItem>
            <SelectItem value={PaymentReconciliationPaymentMethod.debc}>
              {t("payment_method_card")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User filter - kept outside the clubbed popover, like care_fe's Payments page */}
      <div className="w-full sm:w-fit">
        <UserSelector
          facilityId={facilityId}
          selectedUser={selectedUser}
          onChange={(user) => {
            setSelectedUser(user);
            onFiltersChange({
              ...filters,
              createdBy: user?.id || "",
              createdByUsername: user?.username || "",
            });
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-fit">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setActiveFilter(null);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-between font-semibold",
                activeCount > 0 && "border-blue-300 bg-blue-50",
              )}
            >
              <ListFilterIcon className="h-3 w-3" />
              <span className="truncate">{t("filter")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[calc(100vw)] max-w-[calc(100vw-3rem)] sm:max-w-xs p-0"
            align="start"
          >
            {activeFilter ? (
              <div className="p-0">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveFilter(null)}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {FILTER_FIELDS.find((f) => f.key === activeFilter)?.label}
                  </span>
                </div>
                {renderEditor(activeFilter)}
              </div>
            ) : (
              <div className="px-2 pt-2 pb-2">
                {FILTER_FIELDS.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => setActiveFilter(field.key)}
                    className="flex items-center justify-between px-3 py-2 w-full cursor-pointer rounded-sm hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="border border-dotted border-gray-600 rounded w-3 h-3 mb-0.5" />
                      <span className="text-sm">{field.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {field.active && (
                        <span className="text-xs text-gray-500">1</span>
                      )}
                      <ChevronRightIcon className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {FILTER_FIELDS.filter((f) => f.active).map((field) => (
          <Popover
            key={field.key}
            open={openChip === field.key}
            onOpenChange={(next) => {
              if (next) {
                if (field.key === "date") setDateEditorKey((k) => k + 1);
              }
              setOpenChip(next ? field.key : null);
            }}
          >
            <div className="flex items-center bg-white rounded-md border border-gray-200 w-fit">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 h-9 text-sm cursor-pointer"
                >
                  <span className="truncate text-gray-950 font-medium">
                    {field.label}
                  </span>
                </button>
              </PopoverTrigger>
              <div className="flex items-center gap-2 px-3 h-9 whitespace-nowrap border-l border-gray-200">
                {field.key === "status" ? (
                  <span
                    className={cn(
                      "truncate rounded-md border px-2.5 py-px text-sm font-medium",
                      STATUS_PILL_CLASSES[filters.status || ""],
                    )}
                  >
                    {field.summary}
                  </span>
                ) : (
                  <span className="truncate text-gray-950 font-medium text-sm">
                    {field.summary}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => handleClearOne(field.key)}
                aria-label={`${t("clear_filters")}: ${field.label}`}
                className="flex border-l rounded-l-none border-gray-200 hover:bg-gray-50"
              >
                <XIcon className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
            <PopoverContent
              className="w-[calc(100vw)] max-w-[calc(100vw-3rem)] sm:max-w-xs p-0"
              align="start"
            >
              {renderEditor(field.key)}
            </PopoverContent>
          </Popover>
        ))}

        {totalActiveCount > 1 && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-sm text-gray-950 underline items-center w-auto self-start"
          >
            <XIcon strokeWidth={1.5} />
            {t("clear_filters")}
          </Button>
        )}
      </div>
    </div>
  );
};
