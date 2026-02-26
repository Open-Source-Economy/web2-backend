import { ApiError } from "../../errors";
import type { UserWithAuth } from "../../db/mappers/user/user.mapper";

/**
 * Express middleware for per-route use in ts-rest.
 * Ensures the request is authenticated before proceeding.
 *
 * Uses `any` parameter types to be compatible with both Express Request
 * and ts-rest TsRestRequest (which has typed params instead of ParamsDictionary).
 */
export function requireAuth(req: any, res: any, next: any): void {
  if (!req.isAuthenticated() || !req.user) {
    throw ApiError.unauthorized("Authentication required");
  }
  next();
}

/**
 * Helper for typed user extraction inside ts-rest handlers.
 * Use this in handler functions to get the authenticated user.
 */
export function getAuthUser(req: any): UserWithAuth {
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }
  // During migration, req.user is the old User class from api-types.
  // After Phase 2 (repository migration), this cast through unknown can be removed.
  return req.user as unknown as UserWithAuth;
}
