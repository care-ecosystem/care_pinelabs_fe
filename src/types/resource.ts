import { SlugConfig } from "@/types/base";
import { User } from "@/types/user";

export enum ResourceCategoryResourceType {
  product_knowledge = "product_knowledge",
  activity_definition = "activity_definition",
  charge_item_definition = "charge_item_definition",
}

export enum ResourceCategorySubType {
  location = "location",
  practitioner = "practitioner",
  other = "other",
}

export interface ResourceCategoryParent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  level_cache: number;
  parent?: ResourceCategoryParent;
  resource_type: ResourceCategoryResourceType;
  resource_sub_type: ResourceCategorySubType;
}

export type ResourceCategory = {
  id: string;
  title: string;
  description?: string;
  level_cache: number;
  has_children: boolean;
  parent?: ResourceCategoryParent;
  slug: string;
  resource_type: ResourceCategoryResourceType;
  resource_sub_type: ResourceCategorySubType;
  slug_config: SlugConfig;
  created_at: string;
  updated_at: string;
  created_by: User;
  updated_by: User;
};
