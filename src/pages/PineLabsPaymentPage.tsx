import { FC, useEffect } from "react";
import { navigate } from "raviger";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Loader2Icon, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PineLabsPaymentPageProps = {
  facilityId: string;
  invoiceId: string;
};

/**
 * Dedicated page for Pine Labs payment collection.
 * This follows the same pattern as care_fe's native payment page.
 *
 * Route: /pinelabs/facility/:facilityId/billing/invoices/:invoiceId
 *
 * The PaymentSheet automatically opens when this page loads.
 * When the sheet closes (after success/failure/cancel), it navigates back to the invoice page.
 * This approach eliminates ESC key issues since the sheet is on a dedicated route.
 */
const PineLabsPaymentPage: FC<PineLabsPaymentPageProps> = ({
  facilityId,
  invoiceId,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => apis.invoices.retrieve(facilityId, invoiceId),
  });

  const handleBackToInvoice = () => {
    navigate(`/facility/${facilityId}/billing/invoices/${invoiceId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2Icon className="h-6 w-6 animate-spin mr-2" />
            <span>{t("loading")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-red-600">{t("error_loading_invoice")}</p>
              <Button onClick={handleBackToInvoice} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t("back_to_invoice")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 border-b pb-4">
          <Button
            variant="link"
            className="px-0 justify-start"
            onClick={handleBackToInvoice}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>{t("back")}</span>
          </Button>

          <div className="h-6 w-px bg-gray-300" aria-hidden="true" />

          <div>
            <h1 className="text-2xl font-bold">{t("pinelabs_payment")}</h1>
            <p className="text-sm text-gray-500">
              {t("invoice")}: {invoice.number}
            </p>
          </div>
        </div>

        {/* Payment Sheet Component - auto-opens and navigates back on close */}
        <PaymentSheet
          facilityId={facilityId}
          invoice={invoice}
          autoOpen={true}
          onClose={handleBackToInvoice}
        />
      </div>
    </div>
  );
};

export default PineLabsPaymentPage;
