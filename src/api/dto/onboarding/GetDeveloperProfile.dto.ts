import {
  DeveloperProfile,
  DeveloperProject,
  DeveloperIncomePreference,
  DeveloperAvailability,
  DeveloperService,
  ServiceCategory,
} from "../../model";

export interface GetDeveloperProfileDto {
  profile: DeveloperProfile;
  projects: DeveloperProject[];
  incomePreference: DeveloperIncomePreference | null;
  availability: DeveloperAvailability | null;
  services: DeveloperServiceWithCategory[];
}

export interface DeveloperServiceWithCategory extends DeveloperService {
  serviceCategory: ServiceCategory;
  projects: DeveloperProject[];
}

export interface ServiceCategoryDto {
  id: string;
  name: string;
  parentCategory: string | null;
  hasResponseTime: boolean;
}
