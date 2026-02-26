import {
  Currency,
  GithubData,
  LocalUser,
  Provider,
  ThirdPartyUser,
  User,
  UserId,
  UserRole,
} from "@open-source-economy/api-types";

/**
 * Backend-specific extension of LocalUser that includes the hashed password.
 * The api-types LocalUser interface only has email and isEmailVerified,
 * but the backend needs the password for authentication.
 */
export interface BackendLocalUser extends LocalUser {
  password: string;
}

/**
 * Backend-specific extension of User that includes auth-specific data.
 * The api-types User interface only has id, name, role, etc.
 * The backend needs to track the underlying auth data (local or third-party).
 */
export interface BackendUser extends User {
  data: BackendLocalUser | ThirdPartyUser;
}

/**
 * Type guard to check if user data is a BackendLocalUser (has password).
 */
export function isBackendLocalUser(
  data: BackendLocalUser | ThirdPartyUser,
): data is BackendLocalUser {
  return "password" in data && !("provider" in data);
}

/**
 * Type guard to check if user data is a ThirdPartyUser (has provider).
 */
export function isThirdPartyUser(
  data: BackendLocalUser | ThirdPartyUser,
): data is ThirdPartyUser {
  return "provider" in data;
}

/**
 * Data needed to create a new user in the backend.
 */
export interface CreateUser {
  name: string | null;
  data: BackendLocalUser | ThirdPartyUser;
  role: UserRole;
  preferredCurrency?: Currency;
  termsAcceptedVersion: string | null;
}
