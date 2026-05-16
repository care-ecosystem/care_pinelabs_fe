import { Patient } from "@/types/patient";
import { Period } from "@/types/base";

export enum AccountStatus {
  active = "active",
  inactive = "inactive",
  entered_in_error = "entered_in_error",
  on_hold = "on_hold",
}

export enum AccountBillingStatus {
  open = "open",
  carecomplete_notbilled = "carecomplete_notbilled",
  billing = "billing",
  closed_baddebt = "closed_baddebt",
  closed_voided = "closed_voided",
  closed_completed = "closed_completed",
  closed_combined = "closed_combined",
}

export type Account = {
  id: string;
  status: AccountStatus;
  billing_status: AccountBillingStatus;
  name: string;
  service_period: Period;
  description?: string;
  patient: Patient;
  calculated_at?: string;
  total_net: string;
  total_gross: string;
  total_paid: string;
  total_balance: string;
  created_date: string;
};
