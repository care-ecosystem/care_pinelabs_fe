import { lazy } from "react";

const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const PineLabsPaymentPage = lazy(() => import("./pages/PineLabsPaymentPage"));

const routes = {
  "/facility/:facilityId/billing/pinelabs/transactions": ({
    facilityId,
  }: {
    facilityId: string;
  }) => <TransactionsPage facilityId={facilityId} />,
  "/pinelabs/facility/:facilityId/billing/invoices/:invoiceId": ({
    facilityId,
    invoiceId,
  }: {
    facilityId: string;
    invoiceId: string;
  }) => <PineLabsPaymentPage facilityId={facilityId} invoiceId={invoiceId} />,
};

export default routes;
