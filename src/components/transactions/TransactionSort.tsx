import { FC } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransactionSortProps = {
  ordering: string;
  onOrderingChange: (ordering: string) => void;
};

const SORT_OPTIONS: Record<string, string> = {
  "-payment_datetime": "sort_by_latest_payment",
  payment_datetime: "sort_by_oldest_payment",
  "-created_date": "sort_by_latest_created",
  created_date: "sort_by_oldest_created",
};

export const TransactionSort: FC<TransactionSortProps> = ({
  ordering,
  onOrderingChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  return (
    <div className="w-full sm:w-fit">
      <Select value={ordering} onValueChange={onOrderingChange}>
        <SelectTrigger
          aria-label={t("sort_by")}
          className="border-gray-400 text-gray-950 rounded-sm"
        >
          <SelectValue placeholder={t("sort_by")} />
        </SelectTrigger>
        <SelectContent align="end">
          {Object.entries(SORT_OPTIONS).map(([value, text]) => (
            <SelectItem key={text} value={value}>
              {t(text)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
