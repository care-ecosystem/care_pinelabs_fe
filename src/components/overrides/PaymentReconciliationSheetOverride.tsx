import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Override for PaymentReconciliationSheet
 * Shows the Pine Labs payment form directly when Record Payment is clicked
 * Only opens when the sheet is triggered (when open=true)
 */
const PaymentReconciliationSheetOverride = (props: any) => {
  const { open, onOpenChange, facilityId, invoice } = props;
  const { t } = useTranslation(I18NNAMESPACE);

  // Fetch invoice data if not provided
  const { data: fetchedInvoice, isLoading, error } = useQuery({
    queryKey: ["invoice", invoice?.id],
    queryFn: () => apis.invoices.retrieve(facilityId, invoice?.id),
    enabled: !!invoice?.id && open, // Only fetch when sheet is open
  });

  const currentInvoice = invoice || fetchedInvoice;

  // Don't render anything if sheet is not open
  if (!open) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2Icon className="h-6 w-6 animate-spin" />
            <span>{t("loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentInvoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-red-600">{t("error_loading_invoice")}</p>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                {t("back_to_invoice")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show PaymentSheet with autoOpen={true} only when the sheet is open
  // This skips the intermediate button screen and shows the actual payment form
  return (
    <PaymentSheet
      facilityId={facilityId}
      invoice={currentInvoice}
      autoOpen={true}
    />
  );
};

export default PaymentReconciliationSheetOverride;