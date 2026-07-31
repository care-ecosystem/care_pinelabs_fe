import { lazy } from "react";
import PaymentReconciliationSheetOverride from "@/components/overrides/PaymentReconciliationSheetOverride";
import routes from "./routes";

const manifest = {
  plugin: "care_pinelabs",
  routes,
  extends: [],
  overrides: [
    {
      component: "PaymentReconciliationSheet",
      replacement: PaymentReconciliationSheetOverride,
      priority: 10,
    },
  ],
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
