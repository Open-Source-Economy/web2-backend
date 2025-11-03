import { StatusCodes } from "http-status-codes";
import { UserRole } from "@open-source-economy/api-types";
import { checkAuthenticatedUser } from "./authenticatedUser";
import { config, NodeEnv } from "../../config";

/**
 * Middleware to ensure the authenticated user is a SUPER_ADMIN.
 * Must be used after authenticatedUser middleware.
 *
 * Note: In local development mode (NodeEnv.Local), this check is bypassed
 * to allow easier testing without requiring admin role setup in the database.
 */
export function authenticatedSuperAdmin(req: any, res: any, next: any): void {
  // Skip admin role check in local development
  if (config.env === NodeEnv.Local || config.env === NodeEnv.Development) {
    return next();
  }

  // In production/staging, enforce SUPER_ADMIN role
  const user = checkAuthenticatedUser(req);

  if (user.role !== UserRole.SUPER_ADMIN) {
    return res.status(StatusCodes.FORBIDDEN).json({
      error: {
        message: "Only super admins can access this resource",
        statusCode: StatusCodes.FORBIDDEN,
      },
    });
  }

  next();
}
