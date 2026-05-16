export type Permission = {
  name: string;
  slug: string;
  context:
    | "FACILITY"
    | "FACILITY_ORGANIZATION"
    | "PATIENT"
    | "ENCOUNTER"
    | "QUESTIONNAIRE"
    | "ORGANIZATION";
  description?: string;
};

export type Role = {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
};
