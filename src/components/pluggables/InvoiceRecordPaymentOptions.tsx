import { FC } from "react";
import { navigate } from "raviger";
import { Link2Icon } from "lucide-react";
import { Invoice } from "@/types/invoice";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";

export type InvoiceRecordPaymentOptionsProps = {
  facilityId: string;
  invoice: Invoice;
  form?: UseFormReturn;
};

/**
 * Pine Labs payment button that appears in the invoice payment options dropdown.
 * Navigates to a dedicated payment page following the same pattern as care_fe's native payment flow.
 */
const InvoiceRecordPaymentOptions: FC<InvoiceRecordPaymentOptionsProps> = ({
  facilityId,
  invoice
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  const handlePineLabsPayment = () => {
    // Navigate to dedicated Pine Labs payment page
    navigate(
      `/pinelabs/facility/${facilityId}/billing/invoices/${invoice.id}`
    );
  };

  return (
    <div className="care-pinelabs-container w-full">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={handlePineLabsPayment}
      >
        <Link2Icon className="h-4 w-4" />
        {t("collect_via_pinelabs_terminal")}
      </Button>
    </div>
  );
};

export default InvoiceRecordPaymentOptions;
