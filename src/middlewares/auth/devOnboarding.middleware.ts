import { Request, Response } from "express";
import { getDeveloperProfileRepository } from "../../db";
import {
  AuthenticationError,
  DeveloperProfile,
  DeveloperProfileNotFoundError,
  User,
} from "@open-source-economy/api-types";

export const authenticatedDeveloperProfileUser = async (
  req: Request,
  res: Response,
  next: () => void,
) => {
  if (!req.user) {
    throw new AuthenticationError();
  }
  const user = req.user as User;
  const profile = await getDeveloperProfileRepository().getByUserId(user.id);
  if (!profile) {
    throw new DeveloperProfileNotFoundError();
  }
  (req as any).developerProfile = profile;
  next();
};

export const checkAuthenticatedDeveloperProfile = (
  req: Request<any, any, any, any>,
): DeveloperProfile => {
  // @ts-ignore
  const developerProfile = req.developerProfile;
  if (!developerProfile) {
    throw new DeveloperProfileNotFoundError();
  }
  return developerProfile;
};
