import { FC } from "react";
import { Invoice } from "@/types/invoice";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { UseFormReturn } from "react-hook-form";

export type InvoiceRecordPaymentOptionsProps = {
  facilityId: string;
  invoice: Invoice;
  form?: UseFormReturn;
};

const InvoiceRecordPaymentOptions: FC<InvoiceRecordPaymentOptionsProps> = ({
  facilityId,
  invoice,
  form,
}) => {
  return (
    <div className="care-pinelabs-container w-full">
      {form ? (
        <PaymentDialog form={form} facilityId={facilityId} invoice={invoice} />
      ) : (
        <PaymentSheet facilityId={facilityId} invoice={invoice} />
      )}
    </div>
  );
};

export default InvoiceRecordPaymentOptions;
