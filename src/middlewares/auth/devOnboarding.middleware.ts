import { Request, Response } from "express";
import { getDeveloperProfileRepository } from "../../db";
import { DeveloperProfile, User } from "@open-source-economy/api-types";
import { ApiError } from "../../errors";

export const authenticatedDeveloperProfileUser = async (
  req: Request,
  res: Response,
  next: () => void,
) => {
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }
  const user = req.user as User;
  const profile = await getDeveloperProfileRepository().getByUserId(user.id);
  if (!profile) {
    throw ApiError.notFound("Developer profile not found");
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
    throw ApiError.notFound("Developer profile not found");
  }
  return developerProfile;
};
