import { MonetaryComponent, SlugConfig } from "@/types/base";

import { Invoice } from "@/types/invoice";
import { ResourceCategory } from "@/types/resource";

export enum ChargeItemDefinitionStatus {
  draft = "draft",
  active = "active",
  retired = "retired",
}

export type ChargeItemDefinition = {
  id: string;
  status: ChargeItemDefinitionStatus;
  title: string;
  slug: string;
  derived_from_uri?: string;
  description?: string;
  purpose?: string;
  price_components: MonetaryComponent[];
  category: ResourceCategory;
  slug_config: SlugConfig;
};

export enum ChargeItemStatus {
  planned = "planned",
  billable = "billable",
  not_billable = "not_billable",
  aborted = "aborted",
  billed = "billed",
  paid = "paid",
  entered_in_error = "entered_in_error",
}

export enum ChargeItemServiceResource {
  service_request = "service_request",
  medication_dispense = "medication_dispense",
  appointment = "appointment",
  bed_association = "bed_association",
}

export interface ChargeItemOverrideReason {
  code: string;
  display?: string;
}

export type ChargeItem = {
  id: string;
  title: string;
  description?: string;
  status: ChargeItemStatus;
  quantity: string;
  unit_price_components: MonetaryComponent[];
  note?: string;
  override_reason?: ChargeItemOverrideReason;
  total_price: string;
  paid_invoice?: Invoice;
  total_price_components: MonetaryComponent[];
  charge_item_definition: ChargeItemDefinition;
  service_resource: ChargeItemServiceResource;
  service_resource_id?: string;
};
