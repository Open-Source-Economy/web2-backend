import {
  CompanyUserPermissionToken,
  DeveloperProfile,
  RepositoryUserPermissionToken,
} from "@open-source-economy/api-types";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      developerProfile?: DeveloperProfile;
      companyUserPermissionToken?: CompanyUserPermissionToken;
      repositoryUserPermissionToken?: RepositoryUserPermissionToken;
    }
  }
}
