import { Facility } from "@/types/facility";
import { Patient } from "@/types/patient";

export type Encounter = {
  id: string;
  patient: Patient;
  facility: Facility;

  [key: string]: unknown;
};
