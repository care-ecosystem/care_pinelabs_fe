import { FC } from "react";
import { Invoice } from "@/types/invoice";
import { PaymentSheet } from "@/components/payment/PaymentSheet";
import { UseFormReturn } from "react-hook-form";

export type InvoiceRecordPaymentOptionsProps = {
  facilityId: string;
  invoice: Invoice;
  form?: UseFormReturn;
};

const InvoiceRecordPaymentOptions: FC<InvoiceRecordPaymentOptionsProps> = ({
  facilityId,
  invoice
}) => {
  return (
    <div className="care-pinelabs-container w-full">
        <PaymentSheet facilityId={facilityId} invoice={invoice} />
    </div>
  );
};

export default InvoiceRecordPaymentOptions;
