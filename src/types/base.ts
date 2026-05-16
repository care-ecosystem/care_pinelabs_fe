export type Coding = {
  code: string;
  system: string;
  display: string;
  version: string | null;
};

export type Period = {
  start?: string;
  end?: string;
};

export type SlugConfig = {
  facility?: string;
  slug_value: string;
};

export enum ConditionOperation {
  equality = "equality",
  in_range = "in_range",
  intersects_any = "intersects_any",
}

export interface ConditionBase {
  metric: string;
}

export interface ConditionOperationInRangeValue {
  min: number;
  max: number;
}

export type Condition = ConditionBase &
  (
    | {
        operation: ConditionOperation.equality;
        value: string;
      }
    | {
        operation: ConditionOperation.in_range;
        value: ConditionOperationInRangeValue;
      }
    | {
        operation: ConditionOperation.intersects_any;
        values: string[];
      }
  );

export enum MonetaryComponentType {
  base = "base",
  discount = "discount",
  tax = "tax",
  surcharge = "surcharge",
  informational = "informational",
}

export interface MonetaryComponent {
  monetary_component_type: MonetaryComponentType;
  code?: Coding;
  factor?: number;
  amount?: string;
  conditions: Condition[];
}
