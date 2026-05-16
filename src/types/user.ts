import { Role } from "@/types/role";

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  last_login: string;
  profile_picture_url?: string;
  prefix?: string;
  suffix?: string;
  user_type: "staff" | "admin";
  gender: "male" | "female" | "other";
  username: string;
};

export type FacilityUser = {
  id: string;
  role: Role;
  user: User;
};
