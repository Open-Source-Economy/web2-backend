import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dto from "@open-source-economy/api-types";
import {
  getDeveloperProfileRepository,
  getProjectItemRepository,
  getUserRepository,
} from "../db";
import { createVerificationRecordRepository } from "../db/onboarding/VerificationRecord.repository";
import { pool } from "../dbPool";
import { checkAuthenticatedUser } from "../middlewares";
import { DeveloperProfileService, getGithubSyncService } from "../services";
import { getGitHubService } from "../services/github.service";
import { getOwnerRepository } from "../db/github/Owner.repository";
import { getRepositoryRepository } from "../db/github/Repository.repository";
import { getProjectRepository } from "../db/project/Project.repository";

const developerProfileRepo = getDeveloperProfileRepository();
const userRepository = getUserRepository();
const verificationRecordRepo = createVerificationRecordRepository(pool);
const developerProfileService = new DeveloperProfileService(pool);
const projectItemRepo = getProjectItemRepository();
const githubService = getGitHubService();
const ownerRepo = getOwnerRepository();
const repositoryRepo = getRepositoryRepository();
const projectRepo = getProjectRepository();
const githubSyncService = getGithubSyncService(
  githubService,
  ownerRepo,
  repositoryRepo,
  projectRepo,
  projectItemRepo,
);

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

  syncOrganizationRepositories(
    req: Request<
      dto.SyncOrganizationRepositoriesParams,
      dto.ResponseBody<dto.SyncOrganizationRepositoriesResponse>,
      dto.SyncOrganizationRepositoriesBody,
      dto.SyncOrganizationRepositoriesQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncOrganizationRepositoriesResponse>>,
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

  /**
   * Sync all repositories from a GitHub organization
   * Note: SUPER_ADMIN role already verified by authenticatedSuperAdmin middleware
   *
   * This endpoint starts the sync process asynchronously and returns immediately.
   * The sync runs in the background to avoid HTTP timeouts.
   */
  async syncOrganizationRepositories(req, res) {
    const params: dto.SyncOrganizationRepositoriesParams = req.params;
    const query: dto.SyncOrganizationRepositoriesQuery = req.query;

    // Get the project item and validate it's a GitHub organization
    const projectItem = await projectItemRepo.getById(
      new dto.ProjectItemId(params.projectItemId),
    );

    if (!projectItem) {
      throw new dto.ApiError(
        StatusCodes.NOT_FOUND,
        `ProjectItem not found with id ${params.projectItemId}`,
      );
    }

    if (projectItem.projectItemType !== dto.ProjectItemType.GITHUB_OWNER) {
      throw new dto.ApiError(
        StatusCodes.BAD_REQUEST,
        `ProjectItem must be of type GITHUB_OWNER, but got ${projectItem.projectItemType}`,
      );
    }

    const ownerId = projectItem.sourceIdentifier as dto.OwnerId;
    const offset = query.offset || 0;
    const batchSize = query.batchSize;
    const fetchDetails = query.fetchDetails || false;

    // Get the owner to determine type (Organization or User)
    const owner = await ownerRepo.getById(ownerId);
    if (!owner) {
      throw new dto.ApiError(
        StatusCodes.NOT_FOUND,
        `Owner not found with login ${ownerId.login}`,
      );
    }

    const ownerType = owner.type;
    const ownerTypeLabel =
      ownerType === dto.OwnerType.Organization ? "organization" : "user";

    // Start sync in background (fire and forget)
    // Don't await - let it run asynchronously
    (async () => {
      try {
        console.log(
          `[Background] Starting repository sync for ${ownerTypeLabel}: ${ownerId.login} (offset: ${offset}, batchSize: ${batchSize || "default"}, fetchDetails: ${fetchDetails})`,
        );

        // Sync repositories from the owner (organization or user)
        const syncResult = await githubSyncService.syncOrganizationRepositories(
          ownerId,
          ownerType,
          offset,
          batchSize,
          fetchDetails,
        );

        // Create ProjectItems for each synced repository
        const projectItemResult =
          await AdminHelper.createProjectItemsForRepositories(
            syncResult.syncedRepositories,
          );

        console.log(
          `[Background] Completed sync for ${ownerTypeLabel} ${ownerId.login}: ` +
            `${syncResult.totalFetched} total, ${projectItemResult.created} created, ` +
            `${projectItemResult.updated} already existed, ${syncResult.errors.length + projectItemResult.errors.length} errors. ` +
            `Has more: ${syncResult.batchInfo.hasMore}, Next offset: ${syncResult.batchInfo.nextOffset || "N/A"}`,
        );
      } catch (error) {
        console.error(
          `[Background] Error in repository sync for ${ownerTypeLabel} ${ownerId.login}:`,
          error,
        );
      }
    })();

    // Return immediately with 202 Accepted
    const message = batchSize
      ? `Repository sync started for ${ownerTypeLabel} ${ownerId.login} (batch size: ${batchSize}, offset: ${offset}). Check server logs for progress.`
      : `Repository sync started for ${ownerTypeLabel} ${ownerId.login} (offset: ${offset}). Check server logs for progress.`;

    const response: dto.SyncOrganizationRepositoriesResponse = {
      message,
      organizationLogin: ownerId.login,
      offset,
    };

    res.status(StatusCodes.ACCEPTED).send({ success: response });
  },
};

/**
 * Helper functions for admin operations
 */
const AdminHelper = {
  /**
   * Creates or updates ProjectItems for synced repositories.
   *
   * @param syncedRepositories - Array of repositories from GitHub sync
   * @returns Statistics about created and updated ProjectItems
   */
  async createProjectItemsForRepositories(
    syncedRepositories: dto.Repository[],
  ): Promise<{
    created: number;
    updated: number;
    errors: Array<{ repoName: string; error: string }>;
  }> {
    let created = 0;
    let updated = 0;
    const errors: Array<{ repoName: string; error: string }> = [];

    for (const repository of syncedRepositories) {
      try {
        // Check if ProjectItem already exists
        const existingProjectItem = await projectItemRepo.getByGithubRepository(
          repository.id,
        );

        if (!existingProjectItem) {
          // Create new ProjectItem
          await projectItemRepo.create({
            projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
            sourceIdentifier: repository.id,
          });
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        const repoName = `${repository.id.ownerId.login}/${repository.id.name}`;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ repoName, error: errorMessage });
      }
    }

    return { created, updated, errors };
  },
};
