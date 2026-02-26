import {
  CompanyUserPermissionToken,
  DeveloperProfile,
  RepositoryUserPermissionToken,
  UserId,
  UserRole,
  Currency,
} from "@open-source-economy/api-types";

declare global {
  namespace Express {
    // During migration, req.user matches the api-types User interface.
    // ts-rest handlers use getAuthUser() which casts to UserWithAuth.
    interface User {
      id: UserId;
      name: string | null;
      role: UserRole;
      preferredCurrency?: Currency;
      termsAcceptedVersion?: string;
      // Local/third-party auth data (kept as any during migration)
      [key: string]: any;
    }

    interface Request {
      user?: User;
      developerProfile?: DeveloperProfile;
      companyUserPermissionToken?: CompanyUserPermissionToken;
      repositoryUserPermissionToken?: RepositoryUserPermissionToken;
    }
  }
}
