import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionDetailsSheet } from "@/components/transactions/TransactionDetailsSheet";
import { TransactionFilters as Filters } from "@/types/transaction_filters";

type TransactionsPageProps = {
  facilityId: string;
};

const TransactionsPage: FC<TransactionsPageProps> = ({ facilityId }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleRowClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setDetailsOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("pinelabs_transactions")}</h1>
        <p className="text-gray-600">
          {t("pinelabs_transactions_description")}
        </p>
      </div>

      <TransactionFilters
        facilityId={facilityId}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <TransactionsTable
        facilityId={facilityId}
        filters={filters}
        onRowClick={handleRowClick}
      />

      <TransactionDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        transactionId={selectedTransactionId}
      />
    </div>
  );
};

export default TransactionsPage;
