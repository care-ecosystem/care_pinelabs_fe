import { FC } from "react";
import { PaymentSheet } from "./PaymentSheet";
import { Invoice } from "@/types/invoice";
import { Account } from "@/types/account";

interface PaymentFlowWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  invoice?: Invoice;
  account?: Account;
  accountId?: string;
  isCreditNote?: boolean;
}

export const PaymentFlowWrapper: FC<PaymentFlowWrapperProps> = ({
  open,
  onOpenChange,
  facilityId,
  invoice,
  account,
  isCreditNote = false,
}) => {
  if (!open) {
    return null;
  }

  return (
    <PaymentSheet
      facilityId={facilityId}
      invoice={invoice}
      account={account}
      autoOpen={true}
      isCreditNote={isCreditNote}
      onClose={() => {
        onOpenChange(false);
      }}
    />
  );
};

export default PaymentFlowWrapper;