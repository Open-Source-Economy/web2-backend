import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import {
  getDeveloperProfileRepository,
  getProjectItemRepository,
} from "../../db";
import { createVerificationRecordRepository } from "../../db/onboarding/VerificationRecord.repository";
import { pool } from "../../dbPool";
import { requireAuth, getAuthUser } from "../../middlewares/auth/ts-rest-auth";
import { DeveloperProfileService, getGithubSyncService } from "../../services";
import { getGitHubService } from "../../services/github.service";
import { getOwnerRepository } from "../../db/github/Owner.repository";
import { getRepositoryRepository } from "../../db/github/Repository.repository";
import { getProjectRepository } from "../../db/project/Project.repository";
import { ApiError } from "../../errors";
import * as dto from "@open-source-economy/api-types";

const developerProfileRepo = getDeveloperProfileRepository();
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

export const adminRouter = s.router(contract.admin, {
  getAllDeveloperProfiles: {
    middleware: [requireAuth],
    handler: async ({ query }) => {
      const allProfiles = await developerProfileRepo.getAll();
      const profiles: dto.FullDeveloperProfile[] = [];

      for (const developerProfile of allProfiles) {
        const fullProfile =
          await developerProfileService.buildFullDeveloperProfile(
            developerProfile,
          );
        profiles.push(fullProfile);
      }

      let filteredProfiles = profiles;

      if (query.verificationStatus) {
        const targetStatus = query.verificationStatus;
        filteredProfiles = filteredProfiles.filter((profile) => {
          if (
            profile.profileEntry?.verificationRecords &&
            profile.profileEntry?.verificationRecords.length > 0
          ) {
            const latestProfileRecord =
              profile.profileEntry?.verificationRecords[0];
            if (latestProfileRecord.status === targetStatus) {
              return true;
            }
          }
          return profile.projects.some((p: dto.DeveloperProjectItemEntry) => {
            if (p.verificationRecords && p.verificationRecords.length > 0) {
              const latestProjectRecord = p.verificationRecords[0];
              return latestProjectRecord.status === targetStatus;
            }
            return false;
          });
        });
      }

      if (query.searchTerm) {
        const searchLower = query.searchTerm.toLowerCase();
        filteredProfiles = filteredProfiles.filter((profile) => {
          const profileEntry = profile.profileEntry;
          const userName = profileEntry?.user?.name;
          if (userName && userName.toLowerCase().includes(searchLower))
            return true;
          const contactEmail = profileEntry?.profile.contactEmail;
          if (contactEmail && contactEmail.toLowerCase().includes(searchLower))
            return true;
          return profile.projects.some((p: dto.DeveloperProjectItemEntry) => {
            const projectName =
              typeof p.projectItem.sourceIdentifier === "string"
                ? p.projectItem.sourceIdentifier
                : (p.projectItem.sourceIdentifier as any).login ||
                  (p.projectItem.sourceIdentifier as any).name;
            return projectName?.toLowerCase().includes(searchLower);
          });
        });
      }

      return {
        status: 200 as const,
        body: { profiles: filteredProfiles as any },
      };
    },
  },

  createVerificationRecord: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const user = getAuthUser(req);

      const record = await verificationRecordRepo.create(
        body.entityType as any,
        body.entityId,
        body.status as any,
        body.notes,
        user.id as any,
      );

      return {
        status: 201 as const,
        body: { record: record as any },
      };
    },
  },

  syncOrganizationRepositories: {
    middleware: [requireAuth],
    handler: async ({ params, query }) => {
      const projectItem = await projectItemRepo.getById(
        params.projectItemId as dto.ProjectItemId,
      );

      if (!projectItem) {
        throw ApiError.notFound(
          `ProjectItem not found with id ${params.projectItemId}`,
        );
      }

      if (projectItem.projectItemType !== dto.ProjectItemType.GITHUB_OWNER) {
        throw ApiError.badRequest(
          `ProjectItem must be of type GITHUB_OWNER, but got ${projectItem.projectItemType}`,
        );
      }

      const ownerId = {
        login: projectItem.sourceIdentifier as string,
      } as dto.OwnerId;
      const offset = query.offset || 0;
      const batchSize = query.batchSize;
      const fetchDetails = query.fetchDetails || false;

      const owner = await ownerRepo.getById(ownerId);
      if (!owner) {
        throw ApiError.notFound(`Owner not found with login ${ownerId.login}`);
      }

      const ownerType = owner.type;
      const ownerTypeLabel =
        ownerType === dto.OwnerType.Organization ? "organization" : "user";

      // Start sync in background (fire and forget)
      (async () => {
        try {
          console.log(
            `[Background] Starting repository sync for ${ownerTypeLabel}: ${ownerId.login} (offset: ${offset}, batchSize: ${batchSize || "default"}, fetchDetails: ${fetchDetails})`,
          );

          const syncResult =
            await githubSyncService.syncOrganizationRepositories(
              ownerId,
              ownerType,
              offset,
              batchSize,
              fetchDetails,
            );

          let created = 0;
          let updated = 0;
          const errors: Array<{ repoName: string; error: string }> = [];

          for (const repository of syncResult.syncedRepositories) {
            try {
              const existingProjectItem =
                await projectItemRepo.getByGithubRepository(repository.id);
              if (!existingProjectItem) {
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

          console.log(
            `[Background] Completed sync for ${ownerTypeLabel} ${ownerId.login}: ` +
              `${syncResult.totalFetched} total, ${created} created, ` +
              `${updated} already existed, ${syncResult.errors.length + errors.length} errors. ` +
              `Has more: ${syncResult.batchInfo.hasMore}, Next offset: ${syncResult.batchInfo.nextOffset || "N/A"}`,
          );
        } catch (error) {
          console.error(
            `[Background] Error in repository sync for ${ownerTypeLabel} ${ownerId.login}:`,
            error,
          );
        }
      })();

      const message = batchSize
        ? `Repository sync started for ${ownerTypeLabel} ${ownerId.login} (batch size: ${batchSize}, offset: ${offset}). Check server logs for progress.`
        : `Repository sync started for ${ownerTypeLabel} ${ownerId.login} (offset: ${offset}). Check server logs for progress.`;

      return {
        status: 201 as const,
        body: {
          message,
          organizationLogin: ownerId.login,
          offset,
        },
      };
    },
  },
});
