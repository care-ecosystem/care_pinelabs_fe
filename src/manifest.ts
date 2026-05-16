import { lazy } from "react";

const manifest = {
  plugin: "care_pinelabs",
  routes: {},
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
  encounterTabs: {},
};

export default manifest;
