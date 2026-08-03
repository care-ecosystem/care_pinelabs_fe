import { lazy } from "react";
import PaymentReconciliationSheetOverride from "@/components/overrides/PaymentReconciliationSheetOverride";
import routes from "./routes";
import PinelabsDeviceConfigurationForm from "@/components/pluggables/PinelabsDeviceConfigureForm"
import PinelabsDeviceShowPage from "@/components/pluggables/PinelabsDeviceShowPage"
import {
  CreditCard
} from "lucide-react";

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
  devices: [
    {
      type: "pos-terminal",
      icon: CreditCard,
      configureForm: PinelabsDeviceConfigurationForm,
      showPageCard: PinelabsDeviceShowPage,
    },
  ]
} as const;


export default manifest;
