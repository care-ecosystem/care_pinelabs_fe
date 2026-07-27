import { lazy, createElement } from "react";
import PaymentReconciliationSheetOverride from "./components/overrides/PaymentReconciliationSheetOverride";
import routes from "./routes";

const manifest = {
  plugin: "care_pinelabs",
  routes,
  extends: [],
  overrides: [
    {
      component: "PaymentReconciliationSheet",
      replacement: (props: any) => {
        return createElement(PaymentReconciliationSheetOverride, props);
      },
      priority: 0,
    },
  ],
  components: {
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