import { 
  DeveloperRoleType, 
  MergeRightsType 
} from "../../model/onboarding/DeveloperRights";

export interface AddDeveloperRightsDto {
  projectItemId: string;
  mergeRights: MergeRightsType[];
  roles: DeveloperRoleType[];
}

export interface UpdateDeveloperRightsDto {
  mergeRights?: MergeRightsType[];
  roles?: DeveloperRoleType[];
}