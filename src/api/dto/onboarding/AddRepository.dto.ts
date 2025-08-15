import { 
  DeveloperRoleType, 
  MergeRightsType 
} from "../../model/onboarding/DeveloperRights";

export interface AddRepositoryDto {
  githubOwnerId: number;
  githubOwnerLogin: string;
  githubRepositoryId: number;
  githubRepositoryName: string;
  mergeRights: MergeRightsType[];
  roles: DeveloperRoleType[];
  services?: AddRepositoryServiceDto[];
}

export interface AddRepositoryServiceDto {
  serviceId: string;
  hourlyRate: number;
  currency: string;
  responseTimeHours?: number | null;
}