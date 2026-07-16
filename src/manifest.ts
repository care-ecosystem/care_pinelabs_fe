import { lazy } from "react";
import routes from "./routes";

const manifest = {
  plugin: "care_pinelabs",
  routes,
  extends: [],
  components: {
    InvoiceRecordPaymentOptions: lazy(
      () => import("./components/pluggables/InvoiceRecordPaymentOptions")
    ),
    FacilityHomeActions: lazy(
      () => import("./components/pluggables/FacilityHomeActions")
    ),
  },
  navItems: [],
  billingNavItems: [
    {
      name: "Pinelabs Transactions",
      url: "/billing/pinelabs/transactions",
    },
  ],
  encounterTabs: {},
};

export default manifest;
