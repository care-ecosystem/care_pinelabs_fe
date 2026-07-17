import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/transactions/DateRangeFilter";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import {
  PaymentReconciliationStatus,
  PaymentReconciliationPaymentMethod,
} from "@/types/payment_reconciliation";
import { XIcon, Loader2Icon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { LocationTypeIcons } from "@/types/location";
import { UserSelector } from "@/components/transactions/UserSelector";
import { User } from "@/types/user";

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
  const [selectedUser, setSelectedUser] = useState<User | undefined>();

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
    setSelectedUser(undefined);
    onFiltersChange({
      method: PaymentReconciliationPaymentMethod.ddpo, // Keep default method when clearing
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4">


          {/* Date Range */}
          <div className="space-y-2 lg:col-span-1 min-w-0">
            <Label>{t("date")}</Label>
            <DateRangeFilter
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onChange={({ dateFrom, dateTo }) =>
                onFiltersChange({ ...filters, dateFrom, dateTo })
              }
            />
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

          {/* Payment Method Filter - Required (no "All" option) */}
          <div className="space-y-2">
            <Label>
              {t("payment_method")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={filters.method || PaymentReconciliationPaymentMethod.ddpo}
              onValueChange={(value) => {
                onFiltersChange({
                  ...filters,
                  method: value as PaymentReconciliationPaymentMethod,
                });
              }}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>{t("user")}</Label>
            <UserSelector
              facilityId={facilityId}
              selectedUser={selectedUser}
              onChange={(user) => {
                setSelectedUser(user);
                onFiltersChange({ ...filters, createdBy: user?.id || "" });
              }}
            />
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
