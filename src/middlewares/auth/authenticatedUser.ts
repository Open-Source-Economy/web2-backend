import { StatusCodes } from "http-status-codes";
import { Request } from "express";
import { AuthenticationError, User } from "@open-source-economy/api-types";

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
    throw new AuthenticationError();
  }
  return req.user;
};
