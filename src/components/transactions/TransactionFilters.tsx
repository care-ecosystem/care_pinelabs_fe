import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangeFilter } from "@/components/transactions/DateRangeFilter";
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

const METHOD_LABEL_KEYS: Record<string, string> = {
  [PaymentReconciliationPaymentMethod.ddpo]: "payment_method_upi",
  [PaymentReconciliationPaymentMethod.debc]: "payment_method_card",
};

const STATUS_PILL_CLASSES: Record<string, string> = {
  [PaymentReconciliationStatus.active]: "bg-green-100 text-green-800",
  [PaymentReconciliationStatus.draft]: "bg-yellow-100 text-yellow-800",
  [PaymentReconciliationStatus.cancelled]: "bg-red-100 text-red-800",
};

export const TransactionFilters: FC<TransactionFiltersProps> = ({
  facilityId,
  filters,
  onFiltersChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

  const handleClearFilters = () => {
    onFiltersChange({
      ...filters,
      dateFrom: undefined,
      dateTo: undefined,
      status: "",
      method: "",
      location: "",
    });
  };

  const handleClearOne = (key: string) => {
    if (key === "date") {
      onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined });
    } else if (key === "status") {
      onFiltersChange({ ...filters, status: "" });
    } else if (key === "method") {
      onFiltersChange({ ...filters, method: "" });
    } else if (key === "location") {
      onFiltersChange({ ...filters, location: "" });
    }
  };

  const FILTER_FIELDS = [
    {
      key: "date",
      label: t("date"),
      active: !!(filters.dateFrom || filters.dateTo),
      summary: [filters.dateFrom, filters.dateTo]
        .filter(Boolean)
        .map((d) => dayjs(d).format("MMM D, YYYY"))
        .join(" - "),
    },
    {
      key: "status",
      label: t("status"),
      active: !!filters.status,
      summary: filters.status ? t(STATUS_LABEL_KEYS[filters.status]) : "",
    },
    {
      key: "method",
      label: t("payment_method"),
      active: !!filters.method,
      summary: filters.method ? t(METHOD_LABEL_KEYS[filters.method]) : "",
    },
    {
      key: "location",
      label: t("location"),
      active: !!filters.location,
      summary: selectedLocation?.name || "",
    },
  ];

  const activeCount = FILTER_FIELDS.filter((f) => f.active).length;

  const renderEditor = (key: string) => {
    switch (key) {
      case "date":
        return (
          <DateRangeFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={({ dateFrom, dateTo }) =>
              onFiltersChange({ ...filters, dateFrom, dateTo })
            }
          />
        );
      case "status":
        return (
          <Select
            value={filters.status || undefined}
            onValueChange={(value) => {
              if (value === "clear") {
                onFiltersChange({ ...filters, status: "" });
              } else {
                onFiltersChange({
                  ...filters,
                  status: value as PaymentReconciliationStatus,
                });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("all_statuses")} />
            </SelectTrigger>
            <SelectContent>
              {filters.status && (
                <SelectItem value="clear">{t("all_statuses")}</SelectItem>
              )}
              <SelectItem value={PaymentReconciliationStatus.active}>
                {t("status_completed")}
              </SelectItem>
              <SelectItem value={PaymentReconciliationStatus.draft}>
                {t("status_pending")}
              </SelectItem>
              <SelectItem value={PaymentReconciliationStatus.cancelled}>
                {t("status_cancelled")}
              </SelectItem>
            </SelectContent>
          </Select>
        );
      case "method":
        return (
          <Select
            value={filters.method || undefined}
            onValueChange={(value) => {
              if (value === "clear") {
                onFiltersChange({ ...filters, method: "" });
              } else {
                onFiltersChange({
                  ...filters,
                  method: value as PaymentReconciliationPaymentMethod,
                });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("all_methods")} />
            </SelectTrigger>
            <SelectContent>
              {filters.method && (
                <SelectItem value="clear">{t("all_methods")}</SelectItem>
              )}
              <SelectItem value={PaymentReconciliationPaymentMethod.ddpo}>
                {t("payment_method_upi")} / {t("payment_method_bharat_qr")}
              </SelectItem>
              <SelectItem value={PaymentReconciliationPaymentMethod.debc}>
                {t("payment_method_card")}
              </SelectItem>
            </SelectContent>
          </Select>
        );
      case "location":
        return (
          <Select
            value={filters.location || undefined}
            onValueChange={(value) => {
              if (value === "clear") {
                onFiltersChange({ ...filters, location: "" });
              } else {
                onFiltersChange({ ...filters, location: value });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("all_locations")} />
            </SelectTrigger>
            <SelectContent>
              {isLocationsLoading ? (
                <div className="flex items-center justify-center gap-2 p-2">
                  <Loader2Icon className="size-4 animate-spin" />
                  <p className="text-sm text-gray-600">{t("loading")}</p>
                </div>
              ) : (
                <>
                  {filters.location && (
                    <SelectItem value="clear">{t("all_locations")}</SelectItem>
                  )}
                  {locations.map((location) => {
                    const Icon = LocationTypeIcons[location.form];
                    return (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="truncate">{location.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </>
              )}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
      {/* User filter - kept outside the clubbed popover, like care_fe's Payments page */}
      <div className="w-full sm:w-fit">
        <UserSelector
          facilityId={facilityId}
          selectedUser={selectedUser}
          onChange={(user) => {
            setSelectedUser(user);
            onFiltersChange({ ...filters, createdBy: user?.id || "" });
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
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
            className="w-[calc(100vw-3rem)] sm:max-w-xs p-0"
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
                <div className="p-3">{renderEditor(activeFilter)}</div>
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
                      {!!field.summary && (
                        <span className="max-w-24 truncate text-xs text-gray-500">
                          {field.summary}
                        </span>
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
          <div
            key={field.key}
            className="flex items-center bg-white rounded-md border border-gray-200 w-fit"
          >
            <button
              type="button"
              onClick={() => {
                setActiveFilter(field.key);
                setOpen(true);
              }}
              className="flex items-center gap-2 px-3 h-9 text-sm cursor-pointer"
            >
              <span className="truncate text-gray-950 font-medium">
                {field.label}
              </span>
            </button>
            <div className="flex items-center gap-2 px-3 h-9 whitespace-nowrap border-l border-gray-200">
              {field.key === "status" ? (
                <span
                  className={cn(
                    "truncate rounded-full px-2 py-0.5 text-xs font-medium",
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
              className="flex border-l rounded-l-none border-gray-200 hover:bg-gray-50"
            >
              <XIcon className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
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
