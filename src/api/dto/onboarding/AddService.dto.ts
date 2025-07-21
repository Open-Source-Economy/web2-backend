export interface AddServiceDto {
    serviceCategoryId: string;
    serviceName?: string;
    hourlyRate: number;
    currency: string;
    responseTimeHours?: number;
    projectIds: string[];
}

export interface UpdateServiceDto {
    serviceName?: string;
    hourlyRate?: number;
    currency?: string;
    responseTimeHours?: number;
    projectIds?: string[];
}