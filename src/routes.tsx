import { lazy } from "react";

const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));

const routes = {
  "/facility/:facilityId/billing/pinelabs/transactions": ({
    facilityId,
  }: {
    facilityId: string;
  }) => <TransactionsPage facilityId={facilityId} />,
};

export default routes;
