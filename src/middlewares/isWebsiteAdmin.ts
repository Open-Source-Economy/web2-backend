import { UserRole } from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";

export function isWebsiteAdmin(req: any, res: any, next: any): void {
  if (req.isAuthenticated() && req.user!.role === UserRole.SUPER_ADMIN) {
    return next();
  }
  res.sendStatus(StatusCodes.FORBIDDEN);
}
