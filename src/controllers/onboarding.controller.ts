import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dto from "@open-source-economy/api-types";
import { ServiceType } from "@open-source-economy/api-types";
import {
  CreateProjectItemParams,
  DeveloperServiceBody,
  getDeveloperProfileRepository,
  getDeveloperProjectItemRepository,
  getDeveloperServiceRepository,
  getDeveloperSettingsRepository,
  getProjectItemRepository,
  getServiceRepository,
  getUserRepository,
} from "../db";
import { pool } from "../dbPool";
import { terms } from "../config";
import {
  checkAuthenticatedDeveloperProfile,
  checkAuthenticatedUser,
} from "../middlewares";
import {
  DeveloperProfileService,
  githubSyncService,
  mailService,
} from "../services";

const developerProfileRepo = getDeveloperProfileRepository();
const developerSettingsRepo = getDeveloperSettingsRepository();
const developerProjectItemRepo = getDeveloperProjectItemRepository();
const servicesRepo = getServiceRepository();
const developerServiceRepo = getDeveloperServiceRepository();
const projectItemRepo = getProjectItemRepository();
const userRepository = getUserRepository();
const developerProfileService = new DeveloperProfileService(pool);

export interface OnboardingController {
  // Profile management
  createProfile(
    req: Request<
      dto.CreateDeveloperProfileParams,
      dto.ResponseBody<dto.CreateDeveloperProfileResponse>,
      dto.CreateDeveloperProfileBody,
      dto.CreateDeveloperProfileQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateDeveloperProfileResponse>>,
  ): Promise<void>;

  updateContactInfos(
    req: Request<
      dto.UpdateDeveloperContactInfosParams,
      dto.ResponseBody<dto.UpdateDeveloperContactInfosResponse>,
      dto.UpdateDeveloperContactInfosBody,
      dto.UpdateDeveloperContactInfosQuery
    >,
    res: Response<dto.ResponseBody<dto.UpdateDeveloperContactInfosResponse>>,
  ): Promise<void>;

  getDeveloperProfile(
    req: Request<
      dto.GetDeveloperProfileParams,
      dto.ResponseBody<dto.GetDeveloperProfileResponse>,
      dto.GetDeveloperProfileQuery
    >,
    res: Response<dto.ResponseBody<dto.GetDeveloperProfileResponse>>,
  ): Promise<void>;

  // Settings management
  setDeveloperPreferences(
    req: Request<
      dto.SetDeveloperPreferencesParams,
      dto.ResponseBody<dto.SetDeveloperPreferencesResponse>,
      dto.SetDeveloperPreferencesBody,
      dto.SetDeveloperPreferencesQuery
    >,
    res: Response<dto.ResponseBody<dto.SetDeveloperPreferencesResponse>>,
  ): Promise<void>;

  setDeveloperServiceSettings(
    req: Request<
      dto.SetDeveloperServiceSettingsParams,
      dto.ResponseBody<dto.SetDeveloperServiceSettingsResponse>,
      dto.SetDeveloperServiceSettingsBody,
      dto.SetDeveloperServiceSettingsQuery
    >,
    res: Response<dto.ResponseBody<dto.SetDeveloperServiceSettingsResponse>>,
  ): Promise<void>;

  getPotentialProjectsItems(
    req: Request<
      dto.GetPotentialDeveloperProjectItemsParams,
      dto.ResponseBody<dto.GetPotentialDeveloperProjectItemsResponse>,
      dto.GetPotentialDeveloperProjectItemsBody,
      dto.GetPotentialDeveloperProjectItemsQuery
    >,
    res: Response<
      dto.ResponseBody<dto.GetPotentialDeveloperProjectItemsResponse>
    >,
  ): Promise<void>;

  upsertProjectProjectItem(
    req: Request<
      dto.UpsertDeveloperProjectItemParams,
      dto.ResponseBody<dto.UpsertDeveloperProjectItemResponse>,
      dto.UpsertDeveloperProjectItemBody,
      dto.UpsertDeveloperProjectItemQuery
    >,
    res: Response<dto.ResponseBody<dto.UpsertDeveloperProjectItemResponse>>,
  ): Promise<void>;

  removeProjectProjectItem(
    req: Request<
      dto.RemoveDeveloperProjectItemParams,
      dto.ResponseBody<dto.RemoveDeveloperProjectItemResponse>,
      dto.RemoveDeveloperProjectItemBody,
      dto.RemoveDeveloperProjectItemQuery
    >,
    res: Response<dto.ResponseBody<dto.RemoveDeveloperProjectItemResponse>>,
  ): Promise<void>;

  // Service management
  getServiceHierarchy(
    req: Request<
      dto.GetServiceHierarchyParams,
      dto.ResponseBody<dto.GetServiceHierarchyResponse>,
      dto.GetServiceHierarchyBody,
      dto.GetServiceHierarchyQuery
    >,
    res: Response<dto.ResponseBody<dto.GetServiceHierarchyResponse>>,
  ): Promise<void>;

  createCustomService(
    req: Request<
      dto.CreateCustomServiceParams,
      dto.ResponseBody<dto.CreateCustomServiceResponse>,
      dto.CreateCustomServiceBody,
      dto.CreateCustomServiceQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateCustomServiceResponse>>,
  ): Promise<void>;

  /**
   * Upserts one or more developer services. If a service already exists for a project item, it will be updated; otherwise, it will be created.
   * @param req The request object containing developer service details.
   * @param res The response object.
   */
  upsertDeveloperService(
    req: Request<
      dto.UpsertDeveloperServiceParams,
      dto.ResponseBody<dto.UpsertDeveloperServiceResponse>,
      dto.UpsertDeveloperServiceBody,
      dto.UpsertDeveloperServiceQuery
    >,
    res: Response<dto.ResponseBody<dto.UpsertDeveloperServiceResponse>>,
  ): Promise<void>;

  /**
   * Upserts one or more developer services. If a service already exists for a project item, it will be updated; otherwise, it will be created.
   * @param req The request object containing an array of developer service details.
   * @param res The response object.
   */
  upsertDeveloperServices(
    req: Request<
      dto.UpsertDeveloperServicesParams,
      dto.ResponseBody<dto.UpsertDeveloperServicesResponse>,
      dto.UpsertDeveloperServicesBody,
      dto.UpsertDeveloperServicesQuery
    >,
    res: Response<dto.ResponseBody<dto.UpsertDeveloperServicesResponse>>,
  ): Promise<void>;

  deleteDeveloperService(
    req: Request<
      dto.DeleteDeveloperServiceParams,
      dto.ResponseBody<dto.DeleteDeveloperServiceResponse>,
      dto.DeleteDeveloperServiceBody,
      dto.DeleteDeveloperServiceQuery
    >,
    res: Response<dto.ResponseBody<dto.DeleteDeveloperServiceResponse>>,
  ): Promise<void>;

  // Onboarding completion
  completeOnboarding(
    req: Request<
      dto.CompleteOnboardingParams,
      dto.ResponseBody<dto.CompleteOnboardingResponse>,
      dto.CompleteOnboardingBody,
      dto.CompleteOnboardingQuery
    >,
    res: Response<dto.ResponseBody<dto.CompleteOnboardingResponse>>,
  ): Promise<void>;
}

export const OnboardingController: OnboardingController = {
  async createProfile(req, res) {
    const user = checkAuthenticatedUser(req);
    const body: dto.CreateDeveloperProfileBody = req.body;

    const existingProfile = await developerProfileRepo.getByUserId(user.id);

    if (existingProfile) {
      const response: dto.CreateDeveloperProfileResponse = {};
      res.status(StatusCodes.OK).send({ success: response });
    } else {
      if (body.agreedToTerms) {
        await userRepository.updateName(user.id, body.name);
        await userRepository.updateTermsAcceptedVersion(user.id, terms);
        await developerProfileRepo.create(user.id, body.email);

        const response: dto.CreateDeveloperProfileResponse = {};
        res.status(StatusCodes.CREATED).send({ success: response });
      } else {
        throw new dto.ApiError(
          StatusCodes.BAD_REQUEST,
          "You must agree to the terms and conditions to create a profile.",
        );
      }
    }
  },

  async updateContactInfos(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);

    const body: dto.UpdateDeveloperContactInfosBody = req.body;

    await userRepository.updateName(developerProfile.userId, body.name);

    await developerProfileRepo.updateEmail(developerProfile.userId, body.email);

    const response: dto.UpdateDeveloperContactInfosResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getDeveloperProfile(req, res) {
    // User access: fetch their own profile only
    const user = checkAuthenticatedUser(req);
    const existingProfile = await developerProfileRepo.getByUserId(user.id);

    if (existingProfile === null) {
      const response: dto.GetDeveloperProfileResponse = {
        profile: null,
      };
      res.status(StatusCodes.OK).send({ success: response });
    } else {
      const profile = await developerProfileService.buildFullDeveloperProfile(
        existingProfile,
        user,
      );

      const response: dto.GetDeveloperProfileResponse = {
        profile,
      };

      res.status(StatusCodes.OK).send({ success: response });
    }
  },

  async setDeveloperPreferences(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);
    const body: dto.SetDeveloperPreferencesBody = req.body;

    const existingSettings = await developerSettingsRepo.findByProfileId(
      developerProfile.id,
    );

    if (existingSettings) {
      await developerSettingsRepo.updatePartial(developerProfile.id, body);
    } else {
      await developerSettingsRepo.create(
        developerProfile.id,
        body.royaltiesPreference ?? null,
        body.servicesPreference ?? null,
        body.communitySupporterPreference ?? null,
      );
    }

    const response: dto.SetDeveloperPreferencesResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  },

  async setDeveloperServiceSettings(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);
    const body: dto.SetDeveloperServiceSettingsBody = req.body;

    const existingSettings = await developerSettingsRepo.findByProfileId(
      developerProfile.id,
    );

    if (!existingSettings) {
      throw new dto.ApiError(
        StatusCodes.BAD_REQUEST,
        "Developer settings must be initialized before setting preferences. Please set preferences first.",
      );
    }

    await developerSettingsRepo.updatePartial(developerProfile.id, body);

    const response: dto.SetDeveloperServiceSettingsResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getPotentialProjectsItems(
    req: Request<
      dto.GetPotentialDeveloperProjectItemsParams,
      dto.ResponseBody<dto.GetPotentialDeveloperProjectItemsResponse>,
      dto.GetPotentialDeveloperProjectItemsBody,
      dto.GetPotentialDeveloperProjectItemsQuery
    >,
    res: Response<
      dto.ResponseBody<dto.GetPotentialDeveloperProjectItemsResponse>
    >,
  ): Promise<void> {
    const response: dto.GetPotentialDeveloperProjectItemsResponse = {};
    res.status(StatusCodes.CREATED).send({ success: response });
  },

  async upsertProjectProjectItem(
    req: Request<
      dto.UpsertDeveloperProjectItemParams,
      dto.ResponseBody<dto.UpsertDeveloperProjectItemResponse>,
      dto.UpsertDeveloperProjectItemBody,
      dto.UpsertDeveloperProjectItemQuery
    >,
    res: Response<dto.ResponseBody<dto.UpsertDeveloperProjectItemResponse>>,
  ): Promise<void> {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);

    const body: dto.UpsertDeveloperProjectItemBody = req.body;

    // Phase 1: Sync all sourceIdentifiers (outside transaction) with rate limiting
    // Group items by type for efficient bulk syncing
    const repositoryItems: Array<{
      index: number;
      repositoryId: dto.RepositoryId;
    }> = [];
    const ownerItems: Array<{
      index: number;
      ownerId: dto.OwnerId;
    }> = [];
    const urlItems: Array<{
      index: number;
      sourceIdentifier: dto.SourceIdentifier;
    }> = [];

    body.projectItems.forEach((projectItemData, index) => {
      if (
        projectItemData.projectItemType ===
        dto.ProjectItemType.GITHUB_REPOSITORY
      ) {
        repositoryItems.push({
          index,
          repositoryId: projectItemData.sourceIdentifier as dto.RepositoryId,
        });
      } else if (
        projectItemData.projectItemType === dto.ProjectItemType.GITHUB_OWNER
      ) {
        ownerItems.push({
          index,
          ownerId: projectItemData.sourceIdentifier as dto.OwnerId,
        });
      } else {
        urlItems.push({
          index,
          sourceIdentifier: projectItemData.sourceIdentifier,
        });
      }
    });

    // Sync all repositories in bulk with rate limiting
    const repositoryResults: Array<{
      index: number;
      sourceIdentifier: dto.SourceIdentifier;
    }> = [];
    if (repositoryItems.length > 0) {
      const repositoryIds = repositoryItems.map((item) => item.repositoryId);
      const syncedRepositories =
        await githubSyncService.syncRepositories(repositoryIds);
      repositoryItems.forEach((item, i) => {
        const [_, repository] = syncedRepositories[i];
        repositoryResults.push({
          index: item.index,
          sourceIdentifier: repository.id,
        });
      });
    }

    // Sync all owners in bulk with rate limiting
    const ownerResults: Array<{
      index: number;
      sourceIdentifier: dto.SourceIdentifier;
    }> = [];
    if (ownerItems.length > 0) {
      const ownerIds = ownerItems.map((item) => item.ownerId);
      const syncedOwners = await githubSyncService.syncOwners(ownerIds);
      ownerItems.forEach((item, i) => {
        const owner = syncedOwners[i];
        ownerResults.push({
          index: item.index,
          sourceIdentifier: owner.id,
        });
      });
    }

    // Combine all resolved identifiers in the original order
    const resolvedSourceIdentifiers: dto.SourceIdentifier[] = new Array(
      body.projectItems.length,
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
    for (let i = 0; i < body.projectItems.length; i++) {
      const projectItemData = body.projectItems[i];
      const resolvedId = resolvedSourceIdentifiers[i];

      let projectItem = await projectItemRepo.getBySourceIdentifier(
        projectItemData.projectItemType,
        resolvedId,
      );

      if (projectItem) {
        console.log("Project item already exists:", projectItem.id);
      } else {
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
        const projectItemData = body.projectItems[i];

        const existing: dto.DeveloperProjectItem | null =
          await developerProjectItemRepo.findByProfileAndProjectItem(
            developerProfile.id,
            projectItem.id,
            client, // Pass client for transaction
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
            client, // Pass client for transaction
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
            client, // Pass client for transaction
          );
        }

        results.push({
          projectItem: projectItem,
          developerProjectItem: developerProjectItem,
        });
      }

      await client.query("COMMIT");

      const response: dto.UpsertDeveloperProjectItemResponse = {
        results: results,
      };

      // Use CREATED status for bulk operations
      res.status(StatusCodes.CREATED).send({ success: response });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error; // Let error handler deal with it
    } finally {
      client.release();
    }
  },

  async removeProjectProjectItem(req, res) {
    const _ = checkAuthenticatedDeveloperProfile(req);

    const body: dto.RemoveDeveloperProjectItemBody = req.body;

    await developerProjectItemRepo.delete(body.developerProjectItemId);

    const response: dto.RemoveDeveloperProjectItemResponse = {};

    res.status(StatusCodes.OK).send({ success: response });
  },

  async getServiceHierarchy(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);

    const items = await servicesRepo.getHierarchy();
    const response: dto.GetServiceHierarchyResponse = {
      items: items,
    };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async createCustomService(req, res) {
    const body: dto.CreateCustomServiceBody = req.body;

    const service = await servicesRepo.create(
      ServiceType.CUSTOM,
      body.name,
      body.description,
      true,
      body.hasResponseTime || false,
    );

    const response: dto.CreateCustomServiceResponse = {};
    res.status(StatusCodes.CREATED).send({ success: response });
  },

  async upsertDeveloperService(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);
    const body: dto.UpsertDeveloperServiceBody = req.body;

    const upsertedService = await Helper.upsertDeveloperService(
      developerProfile,
      body,
    );

    const response: dto.UpsertDeveloperServiceResponse = {
      developerService: upsertedService,
    };

    res.status(StatusCodes.OK).send({ success: response });
  },

  // TODO: not the best way to do it but it works for now
  async upsertDeveloperServices(
    req: Request<
      dto.UpsertDeveloperServicesParams,
      dto.ResponseBody<dto.UpsertDeveloperServicesResponse>,
      dto.UpsertDeveloperServicesBody,
      dto.UpsertDeveloperServicesQuery
    >,
    res: Response<dto.ResponseBody<dto.UpsertDeveloperServicesResponse>>,
  ): Promise<void> {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);
    const body: dto.UpsertDeveloperServicesBody = req.body;

    const upsertedServices: dto.DeveloperService[] = [];
    for (const service of body.upsertDeveloperServices) {
      const upsertedService = await Helper.upsertDeveloperService(
        developerProfile,
        service,
      );
      upsertedServices.push(upsertedService);
    }

    const response: dto.UpsertDeveloperServicesResponse = {
      developerServices: upsertedServices,
    };

    res.status(StatusCodes.OK).send({ success: response });
  },

  async deleteDeveloperService(req, res) {
    const _ = checkAuthenticatedDeveloperProfile(req);

    const params: dto.DeleteDeveloperServiceBody = req.body;

    // The delete method in the repository expects DeveloperServiceId
    // Ensure params.serviceId is of type DeveloperServiceId
    await developerServiceRepo.delete(params.developerServiceId);

    const response: dto.DeleteDeveloperServiceResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  },

  async completeOnboarding(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);
    const user = checkAuthenticatedUser(req);

    const settings = await developerSettingsRepo.findByProfileId(
      developerProfile.id,
    );
    if (!settings) {
      throw new dto.ApiError(
        StatusCodes.BAD_REQUEST,
        "Developer settings not configured",
      );
    }

    // Build FullDeveloperProfile using shared service
    const fullProfile = await developerProfileService.buildFullDeveloperProfile(
      developerProfile,
      user,
    );

    // Mark onboarding as completed
    await developerProfileRepo.markCompleted(developerProfile.id);

    // Send admin notification email
    try {
      await mailService.sendDeveloperOnboardingCompletionEmail(
        fullProfile,
        user,
      );
    } catch (emailError) {
      // Log the error but don't fail the onboarding completion
      console.error("Failed to send onboarding completion email:", emailError);
    }

    // Send welcome email to the developer
    try {
      await mailService.sendDeveloperWelcomeEmail(
        user.name || "there",
        developerProfile.contactEmail,
      );
    } catch (emailError) {
      // Log the error but don't fail the onboarding completion
      console.error("Failed to send welcome email to developer:", emailError);
    }

    const response: dto.CompleteOnboardingResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  },
};

const Helper = {
  async upsertDeveloperService(
    developerProfile: dto.DeveloperProfile,
    body: dto.UpsertDeveloperServiceBody,
  ): Promise<dto.DeveloperService> {
    // Retrieve existing service offering by profile and service ID
    const existingOffering =
      await developerServiceRepo.getByProfileAndServiceId(
        developerProfile.id,
        body.serviceId,
      );

    const developerServiceBody: DeveloperServiceBody = {
      developerProjectItemIds: body.developerProjectItemIds,
      hourlyRate: body.hourlyRate,
      responseTimeHours: body.responseTimeHours,
      comment: body.comment || undefined,
    };

    let upsertedService: dto.DeveloperService;

    if (existingOffering) {
      // Update existing service offering and its project item links
      upsertedService = await developerServiceRepo.update(
        existingOffering.id,
        developerServiceBody,
      );
    } else {
      // Create new service offering and its project item links
      upsertedService = await developerServiceRepo.create(developerProfile.id, {
        serviceId: body.serviceId,
        body: developerServiceBody,
      });
    }

    return upsertedService;
  },
};
