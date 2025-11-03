import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dto from "@open-source-economy/api-types";
import { getDeveloperProfileRepository, getUserRepository } from "../db";
import { createVerificationRecordRepository } from "../db/onboarding/VerificationRecord.repository";
import { pool } from "../dbPool";
import { checkAuthenticatedUser } from "../middlewares";
import { DeveloperProfileService } from "../services";

const developerProfileRepo = getDeveloperProfileRepository();
const userRepository = getUserRepository();
const verificationRecordRepo = createVerificationRecordRepository(pool);
const developerProfileService = new DeveloperProfileService(pool);

export interface AdminController {
  getAllDeveloperProfiles(
    req: Request<
      dto.GetAllDeveloperProfilesParams,
      dto.ResponseBody<dto.GetAllDeveloperProfilesResponse>,
      {}, // GET request - no body
      dto.GetAllDeveloperProfilesQuery
    >,
    res: Response<dto.ResponseBody<dto.GetAllDeveloperProfilesResponse>>,
  ): Promise<void>;

  getDeveloperProfile(
    req: Request<
      { githubUsername: string },
      dto.ResponseBody<dto.GetDeveloperProfileResponse>,
      {}, // GET request - no body
      dto.GetDeveloperProfileQuery
    >,
    res: Response<dto.ResponseBody<dto.GetDeveloperProfileResponse>>,
  ): Promise<void>;

  createVerificationRecord(
    req: Request<
      dto.CreateVerificationRecordParams,
      dto.ResponseBody<dto.CreateVerificationRecordResponse>,
      dto.CreateVerificationRecordBody,
      dto.CreateVerificationRecordQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateVerificationRecordResponse>>,
  ): Promise<void>;
}

export const AdminController: AdminController = {
  /**
   * Get a single developer profile by GitHub username
   * Note: SUPER_ADMIN role already verified by authenticatedSuperAdmin middleware
   */
  async getDeveloperProfile(req, res) {
    // GitHub username comes from URL params
    const urlParams = req.params as { githubUsername: string };

    const user = await userRepository.findByGithubLogin(
      urlParams.githubUsername,
    );
    if (!user) {
      const response: dto.GetDeveloperProfileResponse = {
        profile: null,
      };
      res.status(StatusCodes.OK).send({ success: response });
      return;
    }

    const existingProfile = await developerProfileRepo.getByUserId(user.id);
    if (!existingProfile) {
      const response: dto.GetDeveloperProfileResponse = {
        profile: null,
      };
      res.status(StatusCodes.OK).send({ success: response });
      return;
    }

    const profile = await developerProfileService.buildFullDeveloperProfile(
      existingProfile,
      user,
    );
    const response: dto.GetDeveloperProfileResponse = { profile };
    res.status(StatusCodes.OK).send({ success: response });
  },

  /**
   * Create a new verification record for a profile or project item
   * Note: SUPER_ADMIN role already verified by authenticatedSuperAdmin middleware
   */
  async createVerificationRecord(req, res) {
    const user = checkAuthenticatedUser(req);
    const body: dto.CreateVerificationRecordBody = req.body;

    // Create the verification record with verifiedBy from authenticated user
    const record = await verificationRecordRepo.create(
      body.entityType,
      body.entityId,
      body.status,
      body.notes,
      user.id,
    );

    res.status(StatusCodes.OK).send({
      success: { record },
    });
  },

  /**
   * Get all developer profiles with optional filtering
   * Note: SUPER_ADMIN role already verified by authenticatedSuperAdmin middleware
   */
  async getAllDeveloperProfiles(req, res) {
    const query: dto.GetAllDeveloperProfilesQuery = req.query;

    // Get all users
    const allUsers = await userRepository.getAll();

    // Build full profiles for users with developer profiles
    const profiles: dto.FullDeveloperProfile[] = [];

    for (const user of allUsers) {
      const developerProfile = await developerProfileRepo.getByUserId(user.id);
      if (developerProfile) {
        const profile = await developerProfileService.buildFullDeveloperProfile(
          developerProfile,
          user,
        );
        profiles.push(profile);
      }
    }

    // Apply filters
    let filteredProfiles = profiles;

    // Filter by verification status
    if (query.verificationStatus) {
      const targetStatus: dto.VerificationStatus = query.verificationStatus;

      filteredProfiles = filteredProfiles.filter((profile) => {
        // Check profile verification status
        if (
          profile.profileEntry?.verificationRecords &&
          profile.profileEntry?.verificationRecords.length > 0
        ) {
          const latestProfileRecord =
            profile.profileEntry?.verificationRecords[0]; // Already sorted DESC
          if (latestProfileRecord.status === targetStatus) {
            return true;
          }
        }

        // Check if any project has the target status
        return profile.projects.some((p: dto.DeveloperProjectItemEntry) => {
          if (p.verificationRecords && p.verificationRecords.length > 0) {
            const latestProjectRecord = p.verificationRecords[0]; // Already sorted DESC
            return latestProjectRecord.status === targetStatus;
          }
          return false;
        });
      });
    }

    // Filter by search term
    if (query.searchTerm) {
      const searchLower = query.searchTerm.toLowerCase();
      filteredProfiles = filteredProfiles.filter((profile) => {
        // Search in name
        if (profile.name?.toLowerCase().includes(searchLower)) return true;

        // Search in email
        if (profile.contactEmail?.toLowerCase().includes(searchLower))
          return true;

        // Search in GitHub username (assuming it's in the user data)
        // We need to get GitHub username from projects
        const hasMatchingProject = profile.projects.some(
          (p: dto.DeveloperProjectItemEntry) => {
            const projectName =
              typeof p.projectItem.sourceIdentifier === "string"
                ? p.projectItem.sourceIdentifier
                : (p.projectItem.sourceIdentifier as any).login ||
                  (p.projectItem.sourceIdentifier as any).name;
            return projectName?.toLowerCase().includes(searchLower);
          },
        );

        return hasMatchingProject;
      });
    }

    res.status(StatusCodes.OK).send({
      success: { profiles: filteredProfiles },
    });
  },
};
