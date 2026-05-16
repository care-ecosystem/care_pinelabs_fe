type OrgType = "root" | "dept" | "team";

export interface FacilityOrganizationParent {
  id: string;
  name: string;
  description?: string;
  org_type: OrgType;
  level_cache: number;
  parent?: FacilityOrganizationParent;
}

export interface FacilityOrganization {
  id: string;
  name: string;
  description?: string;
  org_type: OrgType;
  level_cache: number;
  has_children: boolean;
  active: boolean;
  parent?: FacilityOrganizationParent;
  created_at: string;
  updated_at: string;
}
