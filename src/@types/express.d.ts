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

declare module "express-session" {
  interface SessionData {
    redirectPath?: string;
  }
}
