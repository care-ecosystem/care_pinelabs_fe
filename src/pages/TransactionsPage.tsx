import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionDetailsSheet } from "@/components/transactions/TransactionDetailsSheet";
import { TransactionFilters as Filters } from "@/types/transaction_filters";
import { PaymentReconciliationPaymentMethod } from "@/types/payment_reconciliation";
import { Badge } from "@/components/ui/badge";

type TransactionsPageProps = {
  facilityId: string;
};

const TransactionsPage: FC<TransactionsPageProps> = ({ facilityId }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [filters, setFilters] = useState<Filters>({
    method: PaymentReconciliationPaymentMethod.ddpo, // Default to UPI/Bharat QR
  });
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const handleRowClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setDetailsOpen(true);
  };

  const handleCountChange = (count: number) => {
    setTotalCount(count);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("pinelabs_transactions")}</h1>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {totalCount}
          </Badge>
        </div>
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
        onCountChange={handleCountChange}
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
