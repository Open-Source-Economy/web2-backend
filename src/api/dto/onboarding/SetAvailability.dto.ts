export interface SetAvailabilityDto {
  weeklyCommitment: number;
  largerOpportunities: "yes" | "maybe" | "no";
  hourlyRate: number;
  currency: string;
}

export interface UpdateAvailabilityDto {
  weeklyCommitment?: number;
  largerOpportunities?: "yes" | "maybe" | "no";
  hourlyRate?: number;
  currency?: string;
}
