export interface UpdateServiceDto {
  serviceName?: string;
  hourlyRate?: number;
  currency?: string;
  responseTimeHours?: number | null;
  projectIds?: string[];
}
