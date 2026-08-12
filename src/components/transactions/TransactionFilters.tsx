import { FC, useState, useEffect, ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import {
  StatusBadge,
  STATUS_BADGE_COLOR_CLASSES,
  StatusBadgeColor,
} from "@/components/ui/status-badge";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { isSameDay } from "date-fns";
import {
  DateRangeFilter,
  presetOptions,
} from "@/components/transactions/DateRangeFilter";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import { PaymentReconciliationStatus } from "@/types/payment_reconciliation";
import { PINELABS_PAYMENT_MODES } from "@/lib/paymentMethods";
import {
  XIcon,
  Loader2Icon,
  ListFilterIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  SearchIcon,
  PlusIcon,
} from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apis } from "@/apis";
import { LocationTypeIcons, LocationRead } from "@/types/location";
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

// Owns its own search state so independently-opened editors don't share query text.
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
const LocationTreeItem: FC<{
  facilityId: string;
  location: LocationRead;
  depth: number;
  value: LocationRead | null;
  expandedIds: Set<string>;
  emptyParents: Set<string>;
  onToggleExpand: (id: string) => void;
  onMarkEmpty: (id: string) => void;
  onChoose: (location: LocationRead) => void;
}> = ({
  facilityId,
  location,
  depth,
  value,
  expandedIds,
  emptyParents,
  onToggleExpand,
  onMarkEmpty,
  onChoose,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const isExpanded = expandedIds.has(location.id);
  const isKnownEmpty = emptyParents.has(location.id);

  const canExpand = location.has_children && !isKnownEmpty;
  const isSelected = value?.id === location.id;
  const Icon = LocationTypeIcons[location.form];

  const {
    data: childResponse,
    isLoading: isChildLoading,
    error: childError,
  } = useQuery({
    queryKey: ["pinelabs_locations_tree", facilityId, location.id],
    queryFn: () =>
      apis.locations.list(facilityId, {
        parent: location.id,
        mode: "kind",
        status: "active",
      }),
    enabled: isExpanded && canExpand,
  });

  const children = childResponse?.results || [];

  useEffect(() => {
    if (isExpanded && canExpand && !isChildLoading && !childError && children.length === 0) {
      onMarkEmpty(location.id);
    }
  }, [isExpanded, canExpand, isChildLoading, childError, children.length, location.id, onMarkEmpty]);

  const indent = 8 + depth * 16;

  const handleActivateRow = () => {
    if (canExpand) {
      onToggleExpand(location.id);
    }
  };

  return (
    <>
      <CommandItem
        value={location.id}
        onSelect={handleActivateRow}
        className={cn(
          "flex items-center justify-between gap-2 py-1.5 pr-2 cursor-pointer",
          isSelected && "bg-green-50",
        )}
        style={{ paddingLeft: indent }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {canExpand ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleExpand(location.id);
              }}
              aria-label={t("expand")}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-gray-200 text-gray-500"
            >
              <ChevronRightIcon
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" />
          )}
          {Icon && <Icon className="h-4 w-4 text-gray-500 shrink-0" />}
          <span
            className={cn(
              "text-sm truncate",
              isSelected && "text-primary-600 font-medium",
            )}
          >
            {location.name}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChoose(location);
          }}
          aria-label={t("confirm")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </CommandItem>

      {isExpanded && canExpand && (
        isChildLoading ? (
          <div
            className="flex items-center gap-2 py-1.5 text-xs text-gray-500"
            style={{ paddingLeft: indent + 20 }}
          >
            <Loader2Icon className="h-3 w-3 animate-spin" />
            {t("loading")}
          </div>
        ) : childError ? (
          <div
            className="text-xs text-gray-500 py-1.5"
            style={{ paddingLeft: indent + 20 }}
          >
            {t("failed_to_load_locations")}
          </div>
        ) : (
          children.map((child) => (
            <LocationTreeItem
              key={child.id}
              facilityId={facilityId}
              location={child}
              depth={depth + 1}
              value={value}
              expandedIds={expandedIds}
              emptyParents={emptyParents}
              onToggleExpand={onToggleExpand}
              onMarkEmpty={onMarkEmpty}
              onChoose={onChoose}
            />
          ))
        )
      )}
    </>
  );
};

const LocationFilterPicker: FC<{
  facilityId: string;
  value: LocationRead | null;
  onSelect: (location: LocationRead | null) => void;
  onCommit?: () => void;
}> = ({ facilityId, value, onSelect, onCommit }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [emptyParents, setEmptyParents] = useState<Set<string>>(new Set());

  const {
    data: rootResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: searchQuery
      ? ["pinelabs_locations_search", facilityId, searchQuery]
      : ["pinelabs_locations_tree", facilityId, "root"],
    queryFn: () =>
      apis.locations.list(facilityId, {
        mode: "kind",
        status: "active",
        name: searchQuery || undefined,
      }),
    enabled: !!facilityId,
    placeholderData: keepPreviousData,
  });

  const locations = rootResponse?.results || [];

  const handleChoose = (location: LocationRead) => {
    onSelect(location);
    onCommit?.();
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkEmpty = (id: string) => {
    setEmptyParents((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  return (
    <div className="flex flex-col">
      <Command className="border-0" shouldFilter={false}>
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <CommandInput
              placeholder={t("search_locations")}
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="pl-9 h-9 border-0 focus:ring-0"
            />
          </div>
        </div>

        <CommandList className="max-h-[30vh]">
          <CommandEmpty>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2Icon className="size-4 animate-spin" />
                <p className="text-sm text-gray-600">{t("loading")}</p>
              </div>
            ) : error ? (
              <div className="text-sm text-gray-500 text-center py-4">
                {t("failed_to_load_locations")}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                {searchQuery ? t("no_location_found") : t("no_locations_found")}
              </div>
            )}
          </CommandEmpty>

          <CommandGroup>
            {locations.map((location) => (
              <LocationTreeItem
                key={location.id}
                facilityId={facilityId}
                location={location}
                depth={0}
                value={value}
                expandedIds={expandedIds}
                emptyParents={emptyParents}
                onToggleExpand={handleToggleExpand}
                onMarkEmpty={handleMarkEmpty}
                onChoose={handleChoose}
              />
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

type TransactionFiltersProps = {
  facilityId: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  [PaymentReconciliationStatus.in_progress]: "status_in_progress",
  [PaymentReconciliationStatus.completed]: "status_completed",
  [PaymentReconciliationStatus.failed]: "status_failed",
  [PaymentReconciliationStatus.partial]: "status_partial",
  [PaymentReconciliationStatus.started]: "status_started",
  [PaymentReconciliationStatus.timeout]: "status_timeout",
  [PaymentReconciliationStatus.cancelled]: "status_cancelled",
};

const STATUS_BADGE_COLORS: Record<string, StatusBadgeColor> = {
  [PaymentReconciliationStatus.in_progress]: "info",
  [PaymentReconciliationStatus.completed]: "success",
  [PaymentReconciliationStatus.failed]: "danger",
  [PaymentReconciliationStatus.partial]: "caution",
  [PaymentReconciliationStatus.started]: "warning",
  [PaymentReconciliationStatus.timeout]: "danger",
  [PaymentReconciliationStatus.cancelled]: "danger",
};

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
  // Bumped on open to force DateRangeFilter to remount, avoiding stale state.
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

  const { data: locationsResponse } = useQuery({
    queryKey: ["pinelabs_locations", facilityId],
    queryFn: () =>
      apis.locations.list(facilityId, {
        status: "active",
        mode: "kind",
      }),
    enabled: !!facilityId,
  });

  const locations = locationsResponse?.results || [];
  const selectedLocation = locations.find((l) => l.id === filters.location);

  const { data: pinelabsConfig } = useQuery({
    queryKey: ["pinelabs_config", facilityId],
    queryFn: () => apis.pinelabs_config.get(facilityId),
    enabled: !!facilityId,
  });

  const { data: terminalsResponse, isLoading: isTerminalsLoading } = useQuery({
    queryKey: ["pinelabs_config", pinelabsConfig?.id, "pos-terminals", "all"],
    queryFn: () => apis.pinelabs_config.getTerminals(pinelabsConfig!.id, false),
    enabled: !!pinelabsConfig?.id,
  });

  const terminals = terminalsResponse || [];
  const selectedTerminal = terminals.find((t) => t.id === filters.terminal);

  const configuredPinelabsMethodValues = new Set(
    (pinelabsConfig?.payment_method_mappings ?? []).map(
      (mapping) => mapping.pinelabs_method,
    ),
  );
  const configuredPaymentModes = PINELABS_PAYMENT_MODES.filter((mode) =>
    configuredPinelabsMethodValues.has(mode.value),
  );

  const { data: resolvedUser } = useQuery({
    queryKey: ["pinelabs_user", facilityId, filters.createdBy],
    queryFn: () => apis.users.get(facilityId, filters.createdBy as string),
    enabled: !!filters.createdBy && selectedUser?.id !== filters.createdBy,
  });

  useEffect(() => {
    if (resolvedUser) setSelectedUser(resolvedUser);
  }, [resolvedUser]);

  useEffect(() => {
    if (selectedUser && selectedUser.id !== filters.createdBy) {
      setSelectedUser(undefined);
    }
  }, [filters.createdBy, selectedUser]);

  // User filter is cleared via its own popover, not this button.
  const handleClearFilters = () => {
    onFiltersChange({
      ...filters,
      dateFrom: undefined,
      dateTo: undefined,
      status: "",
      location: "",
      terminal: "",
    });
  };

  const handleClearOne = (key: string) => {
    if (key === "date") {
      onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined });
    } else if (key === "status") {
      onFiltersChange({ ...filters, status: "" });
    } else if (key === "location") {
      onFiltersChange({ ...filters, location: "" });
    } else if (key === "terminal") {
      onFiltersChange({ ...filters, terminal: "" });
    }
  };

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

  const dateOperation =
    filters.dateFrom && filters.dateTo
      ? isSameDay(filters.dateFrom, filters.dateTo)
        ? "is_on"
        : "b/w"
      : filters.dateFrom
        ? "after"
        : filters.dateTo
          ? "before"
          : "";

  const FILTER_FIELDS = [
    {
      key: "date",
      label: t("date"),
      active: !!(filters.dateFrom || filters.dateTo),
      operation: dateOperation ? t(dateOperation) : "",
      summary: dateSummary,
    },
    {
      key: "status",
      label: t("status"),
      active: !!filters.status,
      operation: t("is"),
      summary: filters.status ? t(STATUS_LABEL_KEYS[filters.status]) : "",
    },
    {
      key: "location",
      label: t("location"),
      active: !!filters.location,
      operation: t("is"),
      summary: selectedLocation?.name || "",
    },
    {
      key: "terminal",
      label: t("terminal"),
      active: !!filters.terminal,
      operation: t("is"),
      summary: selectedTerminal?.device.registered_name || "",
    },
  ];

  const activeCount = FILTER_FIELDS.filter((f) => f.active).length;

  const STATUS_OPTIONS: FilterOption[] = [
    {
      value: PaymentReconciliationStatus.started,
      label: t("status_started"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.started]
        ],
    },
    {
      value: PaymentReconciliationStatus.in_progress,
      label: t("status_in_progress"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.in_progress]
        ],
    },
    {
      value: PaymentReconciliationStatus.completed,
      label: t("status_completed"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.completed]
        ],
    },
    {
      value: PaymentReconciliationStatus.failed,
      label: t("status_failed"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.failed]
        ],
    },
    {
      value: PaymentReconciliationStatus.cancelled,
      label: t("status_cancelled"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.cancelled]
        ],
    },
    {
      value: PaymentReconciliationStatus.timeout,
      label: t("status_timeout"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.timeout]
        ],
    },
    {
      value: PaymentReconciliationStatus.partial,
      label: t("status_partial"),
      color:
        STATUS_BADGE_COLOR_CLASSES[
          STATUS_BADGE_COLORS[PaymentReconciliationStatus.partial]
        ],
    },
  ];

  const TERMINAL_OPTIONS: FilterOption[] = terminals.map((terminal) => ({
    value: terminal.id,
    label: terminal.device.registered_name,
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
          <LocationFilterPicker
            facilityId={facilityId}
            value={selectedLocation ?? null}
            onSelect={(location) =>
              onFiltersChange({ ...filters, location: location?.id || "" })
            }
            onCommit={closeFilterPopovers}
          />
        );
      case "terminal":
        return (
          <FilterOptionsList
            options={TERMINAL_OPTIONS}
            selectedValue={filters.terminal || ""}
            onSelect={(value) => onFiltersChange({ ...filters, terminal: value })}
            isLoadingOptions={isTerminalsLoading}
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
          value={
            filters.method ||
            configuredPaymentModes[0]?.value ||
            PINELABS_PAYMENT_MODES[0].value
          }
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              method: value as Filters["method"],
            });
          }}
        >
          <SelectTrigger
            className="w-full text-gray-950"
            aria-label={t("payment_method")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {configuredPaymentModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {t(mode.labelKey)}
              </SelectItem>
            ))}
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
              // "none" marks an explicit clear (vs. default-to-current-user).
              createdBy: user?.id || "none",
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
              {!!field.operation && (
                <div className="flex items-center gap-2 px-2.5 h-9 border-x border-gray-200 underline text-sm text-gray-600 whitespace-nowrap">
                  {field.operation}
                </div>
              )}
              <div className="flex items-center gap-2 px-3 h-9 whitespace-nowrap">
                {field.key === "status" && filters.status ? (
                  <StatusBadge
                    color={STATUS_BADGE_COLORS[filters.status]}
                    className="truncate"
                  >
                    {field.summary}
                  </StatusBadge>
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

        {activeCount > 1 && (
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
