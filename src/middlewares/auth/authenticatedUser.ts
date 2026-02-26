import { StatusCodes } from "http-status-codes";
import { Request } from "express";
import { User } from "@open-source-economy/api-types";
import { ApiError } from "../../errors";

export function authenticatedUser(req: any, res: any, next: any): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.sendStatus(StatusCodes.UNAUTHORIZED);
}

export const checkAuthenticatedUser = (
  req: Request<any, any, any, any>,
): User => {
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }
  return req.user as unknown as User;
};
