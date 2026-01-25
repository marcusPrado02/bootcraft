export type DoctorStatus = "PASS" | "FAIL";

export interface DoctorCheckResult {
  id: string;
  description: string;
  status: DoctorStatus;
  /** Optional actionable hint shown when FAIL */
  hint?: string;
}

export interface DoctorReport {
  projectDir: string;
  results: DoctorCheckResult[];
  ok: boolean;
}
