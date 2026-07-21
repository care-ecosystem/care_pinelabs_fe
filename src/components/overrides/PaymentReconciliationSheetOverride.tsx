import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";


const PaymentReconciliationSheetOverride = (props: any) => {
  const { 
    open, 
    onOpenChange, 
    facilityId, 
    invoice, 
    account, 
    accountId, 
    isCreditNote 
  } = props;
  const { t } = useTranslation(I18NNAMESPACE);

  useEffect(() => {
    console.log("[PaymentReconciliationSheetOverride] Props received:", {
      open,
      facilityId,
      invoice: invoice?.id,
      account: account?.id,
      accountId,
      isCreditNote,
    });
  }, [open, facilityId, invoice, account, accountId, isCreditNote]);

  // Fetch invoice if only ID is provided
  const { 
    data: fetchedInvoice, 
    isLoading: invoiceLoading, 
    error: invoiceError 
  } = useQuery({
    queryKey: ["invoice", invoice?.id],
    queryFn: () => {
      console.log("[PaymentReconciliationSheetOverride] Fetching invoice:", invoice?.id);
      return apis.invoices.retrieve(facilityId, invoice?.id);
    },
    enabled: !!invoice?.id && open && !invoice,
  });

  // Fetch account if only ID is provided
  const { 
    data: fetchedAccount, 
    isLoading: accountLoading, 
    error: accountError 
  } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => {
      console.log("[PaymentReconciliationSheetOverride] Fetching account:", accountId);
      return apis.accounts.retrieve(facilityId, accountId);
    },
    enabled: !!accountId && open && !account && !invoice,
  });

  useEffect(() => {
    if (fetchedInvoice) {
      console.log("[PaymentReconciliationSheetOverride] Invoice fetched:", fetchedInvoice?.id);
    }
    if (fetchedAccount) {
      console.log("[PaymentReconciliationSheetOverride] Account fetched:", fetchedAccount?.id);
    }
  }, [fetchedInvoice, fetchedAccount]);

  const currentInvoice = invoice || fetchedInvoice;
  const currentAccount = account || fetchedAccount;
  const isLoading = invoiceLoading || accountLoading;
  const error = invoiceError || accountError;

  // Determine payment type
  const isInvoicePayment = !!currentInvoice;
  const isAccountPayment = !!currentAccount && !currentInvoice;
  const hasData = isInvoicePayment || isAccountPayment;

  // Get account ID - could be from props or fetched
  const resolvedAccountId = accountId || currentAccount?.id;

  console.log("[PaymentReconciliationSheetOverride] State:", {
    isLoading,
    error: error?.message,
    isInvoicePayment,
    isAccountPayment,
    hasData,
    resolvedAccountId,
  });

  if (!open) {
    return null;
  }

  if (isLoading) {
    console.log("[PaymentReconciliationSheetOverride] Showing loading state");
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

  if (error) {
    console.error("[PaymentReconciliationSheetOverride] Error occurred:", error);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-red-600">
              {isInvoicePayment 
                ? t("error_loading_invoice")
                : t("error_loading_account")}
            </p>
            <p className="text-sm text-gray-500">{error?.message}</p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              {isInvoicePayment
                ? t("back_to_invoice")
                : t("back_to_account")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasData) {
    console.warn("[PaymentReconciliationSheetOverride] No data available");
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-red-600">{t("error_loading_payment_details")}</p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              {t("back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For invoice payments - use PaymentSheet component
  if (isInvoicePayment && currentInvoice) {
    console.log("[PaymentReconciliationSheetOverride] Routing to invoice payment");
    return (
      <PaymentSheet
        facilityId={facilityId}
        invoice={currentInvoice}
        autoOpen={true}
        onClose={() => onOpenChange(false)}
      />
    );
  }

  // For account payments - use PaymentSheet with account ID (STRING)
  if (isAccountPayment && resolvedAccountId) {
    console.log("[PaymentReconciliationSheetOverride] Routing to account payment with ID:", resolvedAccountId);
    return (
      <PaymentSheet
        facilityId={facilityId}
        account={resolvedAccountId}              
        autoOpen={true}
        isCreditNote={isCreditNote}
        onClose={() => onOpenChange(false)}
      />
    );
  }

  return null;
};

export default PaymentReconciliationSheetOverride;