import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import {
  CreateProjectItemParams,
  DeveloperServiceBody,
  developerProfileRepo,
  developerProjectItemRepo,
  developerServiceRepo,
  developerSettingsRepo,
  projectItemRepo,
} from "../../db";
import { getServiceRepository } from "../../db/project/Service.repository";
import { getUserRepository } from "../../db/user/User.repository";
import { pool } from "../../dbPool";
import { terms } from "../../config";
import { requireAuth, getAuthUser } from "../../middlewares/auth/ts-rest-auth";
import { ApiError } from "../../errors";
import {
  DeveloperProfileService,
  githubSyncService,
  mailService,
} from "../../services";
import * as dto from "@open-source-economy/api-types";

const servicesRepo = getServiceRepository();
const userRepository = getUserRepository();
const developerProfileService = new DeveloperProfileService(pool);

/**
 * Helper to get the authenticated developer profile from the user.
 * Throws if user has no developer profile.
 */
async function getAuthDeveloperProfile(
  req: any,
): Promise<dto.DeveloperProfile> {
  const user = getAuthUser(req);
  const profile = await developerProfileRepo.getByUserId(user.id as any);
  if (!profile) {
    throw ApiError.forbidden(
      "Developer profile not found. Please create a profile first.",
    );
  }
  return profile;
}

export const onboardingRouter = s.router(contract.onboarding, {
  createProfile: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const user = getAuthUser(req);
      const existingProfile = await developerProfileRepo.getByUserId(
        user.id as any,
      );

      if (existingProfile) {
        return { status: 201 as const, body: {} };
      }

      if (body.agreedToTerms) {
        await userRepository.updateName(user.id as any, body.name);
        await userRepository.updateTermsAcceptedVersion(
          user.id as any,
          terms.version,
        );
        await developerProfileRepo.create(user.id as any, body.email);
        return { status: 201 as const, body: {} };
      } else {
        throw ApiError.badRequest(
          "You must agree to the terms and conditions to create a profile.",
        );
      }
    },
  },

  getDeveloperProfile: {
    middleware: [requireAuth],
    handler: async ({ req }) => {
      const user = getAuthUser(req);
      const existingProfile = await developerProfileRepo.getByUserId(
        user.id as any,
      );

      if (!existingProfile) {
        return {
          status: 200 as const,
          body: { profile: null } as any,
        };
      }

      const profile = await developerProfileService.buildFullDeveloperProfile(
        existingProfile,
        req.user as any,
      );

      return {
        status: 200 as const,
        body: { profile } as any,
      };
    },
  },

  updateContactInfos: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);

      await userRepository.updateName(developerProfile.userId, body.name);
      await developerProfileRepo.updateEmail(developerProfile.id, body.email);

      return { status: 200 as const, body: {} };
    },
  },

  setDeveloperPreferences: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);

      const existingSettings = await developerSettingsRepo.findByProfileId(
        developerProfile.id,
      );

      if (existingSettings) {
        await developerSettingsRepo.updatePartial(
          developerProfile.id,
          body as any,
        );
      } else {
        await developerSettingsRepo.create(
          developerProfile.id,
          (body as any).royaltiesPreference ?? null,
          (body as any).servicesPreference ?? null,
          (body as any).communitySupporterPreference ?? null,
        );
      }

      return { status: 200 as const, body: {} };
    },
  },

  setDeveloperServiceSettings: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);

      const existingSettings = await developerSettingsRepo.findByProfileId(
        developerProfile.id,
      );

      if (!existingSettings) {
        await developerSettingsRepo.create(developerProfile.id);
      }

      await developerSettingsRepo.updatePartial(
        developerProfile.id,
        body as any,
      );

      return { status: 200 as const, body: {} };
    },
  },

  getPotentialProjectItems: {
    middleware: [requireAuth],
    handler: async ({ req }) => {
      await getAuthDeveloperProfile(req);
      return { status: 200 as const, body: {} as any };
    },
  },

  upsertDeveloperProjectItem: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);

      // Phase 1: Sync all sourceIdentifiers (outside transaction) with rate limiting
      const repositoryItems: Array<{
        index: number;
        repositoryId: dto.RepositoryId;
      }> = [];
      const ownerItems: Array<{ index: number; ownerId: dto.OwnerId }> = [];
      const urlItems: Array<{
        index: number;
        sourceIdentifier: string;
      }> = [];

      (body as any).projectItems.forEach(
        (projectItemData: any, index: number) => {
          if (
            projectItemData.projectItemType ===
            dto.ProjectItemType.GITHUB_REPOSITORY
          ) {
            const [owner, repo] = projectItemData.sourceIdentifier.split("/");
            repositoryItems.push({
              index,
              repositoryId: {
                ownerId: { login: owner },
                name: repo,
              } as dto.RepositoryId,
            });
          } else if (
            projectItemData.projectItemType === dto.ProjectItemType.GITHUB_OWNER
          ) {
            ownerItems.push({
              index,
              ownerId: {
                login: projectItemData.sourceIdentifier,
              } as dto.OwnerId,
            });
          } else {
            urlItems.push({
              index,
              sourceIdentifier: projectItemData.sourceIdentifier,
            });
          }
        },
      );

      // Sync all repositories in bulk
      const repositoryResults: Array<{
        index: number;
        sourceIdentifier: string;
      }> = [];
      if (repositoryItems.length > 0) {
        const repositoryIds = repositoryItems.map((item) => item.repositoryId);
        const syncedRepositories =
          await githubSyncService.syncRepositories(repositoryIds);
        repositoryItems.forEach((item, i) => {
          const [_, repository] = syncedRepositories[i];
          repositoryResults.push({
            index: item.index,
            sourceIdentifier: repository.id as any,
          });
        });
      }

      // Sync all owners in bulk
      const ownerResults: Array<{
        index: number;
        sourceIdentifier: string;
      }> = [];
      if (ownerItems.length > 0) {
        const ownerIds = ownerItems.map((item) => item.ownerId);
        const syncedOwners = await githubSyncService.syncOwners(ownerIds);
        ownerItems.forEach((item, i) => {
          const owner = syncedOwners[i];
          ownerResults.push({
            index: item.index,
            sourceIdentifier: owner.id as any,
          });
        });
      }

      // Combine all resolved identifiers in the original order
      const resolvedSourceIdentifiers: string[] = new Array(
        (body as any).projectItems.length,
      );
      repositoryResults.forEach((result) => {
        resolvedSourceIdentifiers[result.index] = result.sourceIdentifier;
      });
      ownerResults.forEach((result) => {
        resolvedSourceIdentifiers[result.index] = result.sourceIdentifier;
      });
      urlItems.forEach((item) => {
        resolvedSourceIdentifiers[item.index] = item.sourceIdentifier;
      });

      // Phase 2: Create/get all ProjectItems (outside transaction)
      const projectItems: dto.ProjectItem[] = [];
      for (let i = 0; i < (body as any).projectItems.length; i++) {
        const projectItemData = (body as any).projectItems[i];
        const resolvedId = resolvedSourceIdentifiers[i];

        let projectItem = await projectItemRepo.getBySourceIdentifier(
          projectItemData.projectItemType,
          resolvedId,
        );

        if (!projectItem) {
          const params: CreateProjectItemParams = {
            projectItemType: projectItemData.projectItemType,
            sourceIdentifier: resolvedId,
          };
          projectItem = await projectItemRepo.create(params);
        }

        projectItems.push(projectItem);
      }

      // Phase 3: Transaction for DeveloperProjectItems only
      const client = await pool.connect();
      const results: dto.ProjectItemUpsertResult[] = [];

      try {
        await client.query("BEGIN");

        for (let i = 0; i < projectItems.length; i++) {
          const projectItem = projectItems[i];
          const projectItemData = (body as any).projectItems[i];

          const existing =
            await developerProjectItemRepo.findByProfileAndProjectItem(
              developerProfile.id,
              projectItem.id,
              client,
            );

          let developerProjectItem: dto.DeveloperProjectItem;
          if (existing) {
            developerProjectItem = await developerProjectItemRepo.update(
              existing.id,
              projectItemData.mergeRights,
              projectItemData.roles,
              projectItemData.comments,
              projectItemData.customCategories,
              projectItemData.predefinedCategories,
              client,
            );
          } else {
            developerProjectItem = await developerProjectItemRepo.create(
              developerProfile.id,
              projectItem.id,
              projectItemData.mergeRights,
              projectItemData.roles,
              projectItemData.comments,
              projectItemData.customCategories,
              projectItemData.predefinedCategories,
              client,
            );
          }

          results.push({ projectItem, developerProjectItem });
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return {
        status: 201 as const,
        body: { results } as any,
      };
    },
  },

  removeDeveloperProjectItem: {
    middleware: [requireAuth],
    handler: async ({ params, req }) => {
      await getAuthDeveloperProfile(req);
      await developerProjectItemRepo.delete(
        params.developerProjectItemId as dto.DeveloperProjectItemId,
      );
      return { status: 204 as const, body: undefined as any };
    },
  },

  getServiceHierarchy: {
    middleware: [requireAuth],
    handler: async ({ req }) => {
      await getAuthDeveloperProfile(req);
      const items = await servicesRepo.getHierarchy();
      return {
        status: 200 as const,
        body: { items } as any,
      };
    },
  },

  createCustomService: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      await getAuthDeveloperProfile(req);
      await servicesRepo.create(
        dto.ServiceType.CUSTOM,
        body.name,
        body.description,
        true,
        (body as any).hasResponseTime || false,
      );
      return { status: 201 as const, body: {} };
    },
  },

  upsertDeveloperService: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);

      const upsertedService = await upsertDeveloperServiceHelper(
        developerProfile,
        body as any,
      );

      return {
        status: 200 as const,
        body: { developerService: upsertedService } as any,
      };
    },
  },

  upsertDeveloperServices: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);

      const upsertedServices: dto.DeveloperService[] = [];
      for (const service of (body as any).upsertDeveloperServices) {
        const upsertedService = await upsertDeveloperServiceHelper(
          developerProfile,
          service,
        );
        upsertedServices.push(upsertedService);
      }

      return {
        status: 201 as const,
        body: { developerServices: upsertedServices } as any,
      };
    },
  },

  deleteDeveloperService: {
    middleware: [requireAuth],
    handler: async ({ params, req }) => {
      await getAuthDeveloperProfile(req);
      await developerServiceRepo.delete(
        params.developerServiceId as dto.DeveloperServiceId,
      );
      return { status: 204 as const, body: undefined as any };
    },
  },

  completeOnboarding: {
    middleware: [requireAuth],
    handler: async ({ req }) => {
      const developerProfile = await getAuthDeveloperProfile(req);
      const user = getAuthUser(req);

      const settings = await developerSettingsRepo.findByProfileId(
        developerProfile.id,
      );
      if (!settings) {
        throw ApiError.badRequest("Developer settings not configured");
      }

      const fullProfile =
        await developerProfileService.buildFullDeveloperProfile(
          developerProfile,
          req.user as any,
        );

      await developerProfileRepo.markCompleted(developerProfile.id);

      // Send admin notification email (fire and forget)
      try {
        await mailService.sendDeveloperOnboardingCompletionEmail(
          fullProfile,
          req.user as any,
        );
      } catch (emailError) {
        console.error(
          "Failed to send onboarding completion email:",
          emailError,
        );
      }

      // Send welcome email to the developer (fire and forget)
      try {
        await mailService.sendDeveloperWelcomeEmail(
          (req.user as any).name || "there",
          developerProfile.contactEmail,
        );
      } catch (emailError) {
        console.error("Failed to send welcome email to developer:", emailError);
      }

      return { status: 201 as const, body: {} };
    },
  },
});

/**
 * Helper to upsert a single developer service.
 */
async function upsertDeveloperServiceHelper(
  developerProfile: dto.DeveloperProfile,
  body: dto.UpsertDeveloperServiceBody,
): Promise<dto.DeveloperService> {
  const existingOffering = await developerServiceRepo.getByProfileAndServiceId(
    developerProfile.id,
    body.serviceId,
  );

  const developerServiceBody: DeveloperServiceBody = {
    developerProjectItemIds: body.developerProjectItemIds,
    hourlyRate: body.hourlyRate,
    responseTimeHours: body.responseTimeHours,
    comment: body.comment || undefined,
  };

  if (existingOffering) {
    return await developerServiceRepo.update(
      existingOffering.id,
      developerServiceBody,
    );
  } else {
    return await developerServiceRepo.create(developerProfile.id, {
      serviceId: body.serviceId,
      body: developerServiceBody,
    });
  }
}
