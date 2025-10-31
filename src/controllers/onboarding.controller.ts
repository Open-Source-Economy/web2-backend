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
import { terms } from "../config";
import {
  checkAuthenticatedDeveloperProfile,
  checkAuthenticatedUser,
} from "../middlewares";
import { githubSyncService, mailService } from "../services";

const developerProfileRepo = getDeveloperProfileRepository();
const developerSettingsRepo = getDeveloperSettingsRepository();
const developerProjectItemRepo = getDeveloperProjectItemRepository();
const servicesRepo = getServiceRepository();
const developerServiceRepo = getDeveloperServiceRepository();
const projectItemRepo = getProjectItemRepository();
const userRepository = getUserRepository();

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
      dto.GetDeveloperProfileBody,
      dto.GetDeveloperProfileQuery
    >,
    res: Response<dto.ResponseBody<dto.GetDeveloperProfileResponse>>,
  ): Promise<void>;

  // Settings management
  setDeveloperIncomeStreams(
    req: Request<
      dto.SetDeveloperIncomeStreamsParams,
      dto.ResponseBody<dto.SetDeveloperIncomeStreamsResponse>,
      dto.SetDeveloperIncomeStreamsBody,
      dto.SetDeveloperIncomeStreamsQuery
    >,
    res: Response<dto.ResponseBody<dto.SetDeveloperIncomeStreamsResponse>>,
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
    const user = checkAuthenticatedUser(req);

    const existingProfile = await developerProfileRepo.getByUserId(user.id);

    if (existingProfile === null) {
      const response: dto.GetDeveloperProfileResponse = {
        profile: null,
      };
      res.status(StatusCodes.OK).send({ success: response });
    } else {
      const profile = await Helper.buildFullDeveloperProfile(
        existingProfile,
        user,
      );

      const response: dto.GetDeveloperProfileResponse = {
        profile,
      };

      res.status(StatusCodes.OK).send({ success: response });
    }
  },

  async setDeveloperIncomeStreams(req, res) {
    const developerProfile = checkAuthenticatedDeveloperProfile(req);
    const body: dto.SetDeveloperIncomeStreamsBody = req.body;

    const existingSettings = await developerSettingsRepo.findByProfileId(
      developerProfile.id,
    );

    if (existingSettings) {
      await developerSettingsRepo.updatePartial(developerProfile.id, {
        incomeStreams: body.incomeStreams,
      });
    } else {
      await developerSettingsRepo.create(
        developerProfile.id,
        body.incomeStreams,
      );
    }

    const response: dto.SetDeveloperIncomeStreamsResponse = {};
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
        "Developer settings must be initialized before setting income streams. Please set service settings first.",
      );
    } else {
      await developerSettingsRepo.updatePartial(developerProfile.id, {
        hourlyWeeklyCommitment: body.hourlyWeeklyCommitment,
        hourlyWeeklyCommitmentComment:
          body.hourlyWeeklyCommitmentComments || null,
        openToOtherOpportunity: body.openToOtherOpportunity,
        openToOtherOpportunityComment:
          body.openToOtherOpportunityComments || null,
        hourlyRate: body.hourlyRate,
        hourlyRateComment: body.hourlyRateComments || null,
        currency: body.currency,
      });
    }

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

    let sourceIdentifier: dto.SourceIdentifier;
    if (body.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY) {
      const [_, repository] = await githubSyncService.syncRepository(
        body.sourceIdentifier as dto.RepositoryId,
      ); // TODO: improve type safety
      sourceIdentifier = repository.id;
    } else if (body.projectItemType === dto.ProjectItemType.GITHUB_OWNER) {
      const owner = await githubSyncService.syncOwner(
        body.sourceIdentifier as dto.OwnerId,
      ); // TODO: improve type safety
      sourceIdentifier = owner.id;
    } else {
      sourceIdentifier = body.sourceIdentifier;
    }

    let projectItem = await projectItemRepo.getBySourceIdentifier(
      body.projectItemType,
      sourceIdentifier,
    );

    if (projectItem) {
      console.log("Project item already exists:", projectItem.id);
    } else {
      const params: CreateProjectItemParams = {
        projectItemType: body.projectItemType,
        sourceIdentifier: sourceIdentifier,
      };
      projectItem = await projectItemRepo.create(params);
    }

    const existing: dto.DeveloperProjectItem | null =
      await developerProjectItemRepo.findByProfileAndProjectItem(
        developerProfile.id,
        projectItem.id,
      );

    if (existing) {
      const developerProjectItem = await developerProjectItemRepo.update(
        existing.id,
        body.mergeRights,
        body.roles,
        body.comments,
        body.customCategories,
        body.predefinedCategories,
      );
      const response: dto.UpsertDeveloperProjectItemResponse = {
        projectItem: projectItem,
        developerProjectItem: developerProjectItem,
      };
      res.status(StatusCodes.OK).send({ success: response });
    } else {
      const developerProjectItem = await developerProjectItemRepo.create(
        developerProfile.id,
        projectItem.id,
        body.mergeRights,
        body.roles,
        body.comments,
        body.customCategories,
        body.predefinedCategories,
      );

      const response: dto.UpsertDeveloperProjectItemResponse = {
        projectItem: projectItem,
        developerProjectItem: developerProjectItem,
      };
      res.status(StatusCodes.CREATED).send({ success: response });
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

    // Build FullDeveloperProfile using shared helper
    const fullProfile = await Helper.buildFullDeveloperProfile(
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

    const response: dto.CompleteOnboardingResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  },
};

const Helper = {
  /**
   * Builds a FullDeveloperProfile object with all associated data
   * Reusable helper to avoid code duplication
   */
  async buildFullDeveloperProfile(
    developerProfile: dto.DeveloperProfile,
    user: dto.User,
  ): Promise<dto.FullDeveloperProfile> {
    const settings = await developerSettingsRepo.findByProfileId(
      developerProfile.id,
    );

    // Build projects array
    const projects: dto.DeveloperProjectItemEntry[] = [];
    const developerProjectItems =
      await developerProjectItemRepo.findByProfileId(developerProfile.id);
    for (const developerProjectItem of developerProjectItems) {
      const projectItem = await projectItemRepo.getById(
        developerProjectItem.projectItemId,
      );
      if (!projectItem) {
        throw new dto.ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Project item not found for developer project item",
        );
      }
      projects.push({
        projectItem: projectItem,
        developerProjectItem: developerProjectItem,
      });
    }

    // Build services array
    const services: dto.DeveloperServiceEntry[] = [];
    const devServices = await developerServiceRepo.getByProfileId(
      developerProfile.id,
    );
    for (const devService of devServices) {
      const service = await servicesRepo.findById(devService.serviceId);
      if (!service) {
        throw new dto.ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Service not found for developer service",
        );
      }
      services.push({ service: service, developerService: devService });
    }

    return {
      name: user.name,
      contactEmail: developerProfile.contactEmail,
      agreedToTerms: user.termsAcceptedVersion === terms.version,
      profile: developerProfile,
      settings: settings,
      projects: projects,
      services: services,
    };
  },

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
