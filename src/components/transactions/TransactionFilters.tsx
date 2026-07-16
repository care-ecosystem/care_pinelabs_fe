import { FC } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import {
  PaymentReconciliationStatus,
  PaymentReconciliationPaymentMethod,
} from "@/types/payment_reconciliation";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import { CalendarIcon, XIcon, Loader2Icon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { LocationTypeIcons } from "@/types/location";

type TransactionFiltersProps = {
  facilityId: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export const TransactionFilters: FC<TransactionFiltersProps> = ({
  facilityId,
  filters,
  onFiltersChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

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

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date From */}
          <div className="space-y-2">
            <Label>{t("date_from")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateFrom && "text-gray-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom
                    ? dayjs(filters.dateFrom).format("MMM D, YYYY")
                    : t("select_date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateFrom: date })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label>{t("date_to")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateTo && "text-gray-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo
                    ? dayjs(filters.dateTo).format("MMM D, YYYY")
                    : t("select_date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateTo: date })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>{t("status")}</Label>
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
              <SelectTrigger>
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
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-2">
            <Label>{t("payment_method")}</Label>
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
              <SelectTrigger>
                <SelectValue placeholder={t("all_methods")} />
              </SelectTrigger>
              <SelectContent>
                {filters.method && (
                  <SelectItem value="clear">{t("all_methods")}</SelectItem>
                )}
                <SelectItem value={PaymentReconciliationPaymentMethod.debc}>
                  {t("payment_method_card")}
                </SelectItem>
                <SelectItem value={PaymentReconciliationPaymentMethod.ddpo}>
                  {t("payment_method_upi")} / {t("payment_method_bharat_qr")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <Label>{t("location")}</Label>
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
              <SelectTrigger>
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
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <XIcon className="h-4 w-4" />
            {t("clear_filters")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
