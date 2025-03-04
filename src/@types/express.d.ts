import {
  CompanyUserPermissionToken,
  RepositoryUserPermissionToken,
} from "../api/model";

declare global {
  namespace Express {
    interface Request {
      companyUserPermissionToken?: CompanyUserPermissionToken;
      repositoryUserPermissionToken?: RepositoryUserPermissionToken;
    }
  }
}
