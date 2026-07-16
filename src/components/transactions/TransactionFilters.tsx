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
  PaymentReconciliationOutcome,
  PaymentReconciliationPaymentMethod,
} from "@/types/payment_reconciliation";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import { CalendarIcon, XIcon } from "lucide-react";

type TransactionFiltersProps = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export const TransactionFilters: FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

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
              value={filters.outcome || undefined}
              onValueChange={(value) => {
                if (value === "clear") {
                  onFiltersChange({ ...filters, outcome: "" });
                } else {
                  onFiltersChange({
                    ...filters,
                    outcome: value as PaymentReconciliationOutcome,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("all_statuses")} />
              </SelectTrigger>
              <SelectContent>
                {filters.outcome && (
                  <SelectItem value="clear">{t("all_statuses")}</SelectItem>
                )}
                <SelectItem value={PaymentReconciliationOutcome.complete}>
                  {t("status_complete")}
                </SelectItem>
                <SelectItem value={PaymentReconciliationOutcome.error}>
                  {t("status_error")}
                </SelectItem>
                <SelectItem value={PaymentReconciliationOutcome.partial}>
                  {t("status_partial")}
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

          {/* Invoice Search */}
          <div className="space-y-2">
            <Label>{t("invoice_number")}</Label>
            <Input
              placeholder={t("search_invoice")}
              value={filters.invoiceNumber || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, invoiceNumber: e.target.value })
              }
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
