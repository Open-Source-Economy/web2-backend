import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dto from "../api/dto";
import { ApiError } from "../api/model/error/ApiError";
import { User, UserId, userUtils } from "../api/model";
import {
  getDeveloperProfileRepository,
  getDeveloperProjectRepository,
  getDeveloperIncomePreferenceRepository,
  getDeveloperAvailabilityRepository,
  getServiceCategoryRepository,
  getDeveloperServiceRepository,
} from "../db";
import { getOwnerRepository } from "../db/github";
import { getGitHubService } from "../services/github.service";

const developerProfileRepo = getDeveloperProfileRepository();
const developerProjectRepo = getDeveloperProjectRepository();
const developerIncomePreferenceRepo = getDeveloperIncomePreferenceRepository();
const developerAvailabilityRepo = getDeveloperAvailabilityRepository();
const serviceCategoryRepo = getServiceCategoryRepository();
const developerServiceRepo = getDeveloperServiceRepository();
const ownerRepo = getOwnerRepository();
const githubService = getGitHubService();

export interface OnboardingController {
  createProfile(req: Request, res: Response): Promise<void>;
  updateProfile(req: Request, res: Response): Promise<void>;
  addProject(req: Request, res: Response): Promise<void>;
  updateProject(req: Request, res: Response): Promise<void>;
  deleteProject(req: Request, res: Response): Promise<void>;
  getGithubOrganizations(req: Request, res: Response): Promise<void>;
  getGithubRepositories(req: Request, res: Response): Promise<void>;
  setIncomePreference(req: Request, res: Response): Promise<void>;
  setAvailability(req: Request, res: Response): Promise<void>;
  getServiceCategories(req: Request, res: Response): Promise<void>;
  addService(req: Request, res: Response): Promise<void>;
  updateService(req: Request, res: Response): Promise<void>;
  deleteService(req: Request, res: Response): Promise<void>;
  getDeveloperProfile(req: Request, res: Response): Promise<void>;
  completeOnboarding(req: Request, res: Response): Promise<void>;
}

export const OnboardingController: OnboardingController = {
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const profileData: dto.CreateDeveloperProfileDto = req.body;

      const existingProfile = await developerProfileRepo.getByUserId(
        user.id.uuid,
      );
      if (existingProfile) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          "Developer profile already exists",
        );
      }

      const profile = await developerProfileRepo.create(
        profileData,
        user.id.uuid,
      );

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          id: profile.id.uuid,
          onboardingCompleted: profile.onboardingCompleted,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to create developer profile",
        });
      }
    }
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const updates: dto.UpdateDeveloperProfileDto = req.body;

      const existingProfile = await developerProfileRepo.getByUserId(
        user.id.uuid,
      );
      if (!existingProfile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const updatedProfile = await developerProfileRepo.update(
        existingProfile.id.uuid,
        updates,
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          id: updatedProfile.id.uuid,
          onboardingCompleted: updatedProfile.onboardingCompleted,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to update developer profile",
        });
      }
    }
  },

  async addProject(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const projectData: dto.AddProjectDto = req.body;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const project = await developerProjectRepo.create(
        projectData,
        profile.id.uuid,
      );

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          id: project.id.uuid,
          projectType: project.projectType,
          githubOrg: project.githubOrg,
          githubRepo: project.githubRepo,
          projectName: project.projectName,
          projectUrl: project.projectUrl,
          role: project.role,
          mergeRights: project.mergeRights,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to add project",
        });
      }
    }
  },

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;
      const updates: dto.UpdateProjectDto = req.body;

      const project = await developerProjectRepo.getById(id);
      if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
      }

      const user = req.user as User;
      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile || profile.id.uuid !== project.developerProfileId.uuid) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
      }

      const updatedProject = await developerProjectRepo.update(id, updates);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          id: updatedProject.id.uuid,
          projectType: updatedProject.projectType,
          githubOrg: updatedProject.githubOrg,
          githubRepo: updatedProject.githubRepo,
          projectName: updatedProject.projectName,
          projectUrl: updatedProject.projectUrl,
          role: updatedProject.role,
          mergeRights: updatedProject.mergeRights,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to update project",
        });
      }
    }
  },

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;

      const project = await developerProjectRepo.getById(id);
      if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
      }

      const user = req.user as User;
      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile || profile.id.uuid !== project.developerProfileId.uuid) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
      }

      await developerProjectRepo.delete(id);

      res.status(StatusCodes.OK).json({
        success: true,
        data: { message: "Project deleted successfully" },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to delete project",
        });
      }
    }
  },

  async getGithubOrganizations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const githubData = userUtils.githubData(user);
      if (!githubData) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "GitHub authentication required",
        );
      }

      // Get stored GitHub token
      const githubToken = await ownerRepo.getTokenByUserId(user.id.uuid);
      if (!githubToken) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "GitHub access token not found. Please reconnect your GitHub account.",
        );
      }

      const organizations =
        await githubService.getUserOrganizations(githubToken);

      res.status(StatusCodes.OK).json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get GitHub organizations",
        });
      }
    }
  },

  async getGithubRepositories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { org } = req.params;
      const user = req.user as User;

      const githubData = userUtils.githubData(user);
      if (!githubData) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "GitHub authentication required",
        );
      }

      // Get stored GitHub token
      const githubToken = await ownerRepo.getTokenByUserId(user.id.uuid);
      if (!githubToken) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "GitHub access token not found. Please reconnect your GitHub account.",
        );
      }

      const repositories =
        org === "user"
          ? await githubService.getUserRepositories(githubToken)
          : await githubService.getOrganizationRepositories(org, githubToken);

      res.status(StatusCodes.OK).json({
        success: true,
        data: repositories,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get GitHub repositories",
        });
      }
    }
  },

  async setIncomePreference(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const preferenceData: dto.SetIncomePreferenceDto = req.body;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const preference = await developerIncomePreferenceRepo.createOrUpdate(
        preferenceData,
        profile.id.uuid,
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          id: preference.id.uuid,
          incomeType: preference.incomeType,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to set income preference",
        });
      }
    }
  },

  async setAvailability(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const availabilityData: dto.SetAvailabilityDto = req.body;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const availability = await developerAvailabilityRepo.createOrUpdate(
        availabilityData,
        profile.id.uuid,
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          id: availability.id.uuid,
          weeklyCommitment: availability.weeklyCommitment,
          largerOpportunities: availability.largerOpportunities,
          hourlyRate: availability.hourlyRate,
          currency: availability.currency,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to set availability",
        });
      }
    }
  },

  async getServiceCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await serviceCategoryRepo.getAll();

      res.status(StatusCodes.OK).json({
        success: true,
        data: categories.map((cat) => ({
          id: cat.id.uuid,
          name: cat.name,
          parentCategory: cat.parentCategory,
          hasResponseTime: cat.hasResponseTime,
        })),
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to get service categories",
      });
    }
  },

  async addService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const serviceData: dto.AddServiceDto = req.body;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const service = await developerServiceRepo.create(
        serviceData,
        profile.id.uuid,
      );

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          id: service.id.uuid,
          serviceCategoryId: service.serviceCategoryId.uuid,
          serviceName: service.serviceName,
          hourlyRate: service.hourlyRate,
          currency: service.currency,
          responseTimeHours: service.responseTimeHours,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to add service",
        });
      }
    }
  },

  async updateService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;
      const updates: dto.UpdateServiceDto = req.body;

      const service = await developerServiceRepo.getById(id);
      if (!service) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
      }

      const user = req.user as User;
      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile || profile.id.uuid !== service.developerProfileId.uuid) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
      }

      const updatedService = await developerServiceRepo.update(id, updates);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          id: updatedService.id.uuid,
          serviceCategoryId: updatedService.serviceCategoryId.uuid,
          serviceName: updatedService.serviceName,
          hourlyRate: updatedService.hourlyRate,
          currency: updatedService.currency,
          responseTimeHours: updatedService.responseTimeHours,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to update service",
        });
      }
    }
  },

  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;

      const service = await developerServiceRepo.getById(id);
      if (!service) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
      }

      const user = req.user as User;
      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile || profile.id.uuid !== service.developerProfileId.uuid) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
      }

      await developerServiceRepo.delete(id);

      res.status(StatusCodes.OK).json({
        success: true,
        data: { message: "Service deleted successfully" },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to delete service",
        });
      }
    }
  },

  async getDeveloperProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const [projects, incomePreference, availability, services] =
        await Promise.all([
          developerProjectRepo.getByProfileId(profile.id.uuid),
          developerIncomePreferenceRepo.getByProfileId(profile.id.uuid),
          developerAvailabilityRepo.getByProfileId(profile.id.uuid),
          developerServiceRepo.getByProfileId(profile.id.uuid),
        ]);

      const servicesWithDetails = await Promise.all(
        services.map(async (service) => {
          const [category, serviceProjects] = await Promise.all([
            serviceCategoryRepo.getById(service.serviceCategoryId.uuid),
            developerServiceRepo.getServiceProjects(service.id.uuid),
          ]);

          const serviceProjectDetails = projects.filter((p) =>
            serviceProjects.includes(p.id.uuid),
          );

          return {
            ...service,
            serviceCategory: category,
            projects: serviceProjectDetails,
          };
        }),
      );

      const responseData: dto.GetDeveloperProfileDto = {
        profile,
        projects,
        incomePreference,
        availability,
        services: servicesWithDetails as any,
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get developer profile",
        });
      }
    }
  },

  async completeOnboarding(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const [projects, incomePreference, availability] = await Promise.all([
        developerProjectRepo.getByProfileId(profile.id.uuid),
        developerIncomePreferenceRepo.getByProfileId(profile.id.uuid),
        developerAvailabilityRepo.getByProfileId(profile.id.uuid),
      ]);

      if (projects.length === 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "At least one project is required",
        );
      }

      if (!incomePreference) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Income preference is required",
        );
      }

      if (!availability) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Availability information is required",
        );
      }

      await developerProfileRepo.markCompleted(profile.id.uuid);

      res.status(StatusCodes.OK).json({
        success: true,
        data: { message: "Onboarding completed successfully" },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to complete onboarding",
        });
      }
    }
  },
};
