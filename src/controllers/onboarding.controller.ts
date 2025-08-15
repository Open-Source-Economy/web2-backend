import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as dto from "../api/dto";
import { ApiError } from "../api/model/error/ApiError";
import { User, userUtils } from "../api/model";
import { Owner, OwnerId, OwnerType } from "../api/model/github/Owner";
import { Repository, RepositoryId } from "../api/model/github/Repository";
import { 
  OpenToOtherOpportunityType, 
  CurrencyType,
  IncomeStreamType 
} from "../api/model/onboarding/DeveloperSettings";
import {
  getDeveloperProfileRepository,
  DeveloperSettingsRepository,
  DeveloperRightsRepository,
  ServicesRepository,
  getDeveloperServiceRepository,
} from "../db/onboarding";
import { getOwnerRepository } from "../db/github";
import { getRepositoryRepository } from "../db/github";
import { getProjectItemRepository } from "../db/project";
import { getUserRepository } from "../db/user/User.repository";
import { getGitHubService } from "../services/github.service";
import { logger } from "../config";
import { pool } from "../dbPool";

const developerProfileRepo = getDeveloperProfileRepository();
const developerSettingsRepo = new DeveloperSettingsRepository(pool);
const developerRightsRepo = new DeveloperRightsRepository(pool);
const servicesRepo = new ServicesRepository(pool);
const developerServiceRepo = getDeveloperServiceRepository();
const ownerRepo = getOwnerRepository();
const repositoryRepo = getRepositoryRepository();
const projectItemRepo = getProjectItemRepository();
const userRepo = getUserRepository();
const githubService = getGitHubService();

export interface OnboardingController {
  // Profile management
  createProfile(req: Request, res: Response): Promise<void>;
  updateProfile(req: Request, res: Response): Promise<void>;
  getDeveloperProfile(req: Request, res: Response): Promise<void>;
  
  // Settings management
  setDeveloperSettings(req: Request, res: Response): Promise<void>;
  setIncomeStreams(req: Request, res: Response): Promise<void>;
  
  // Repository management
  addRepository(req: Request, res: Response): Promise<void>;
  removeRepository(req: Request, res: Response): Promise<void>;
  getRepositories(req: Request, res: Response): Promise<void>;
  
  // GitHub integration
  getGithubOrganizations(req: Request, res: Response): Promise<void>;
  getGithubRepositories(req: Request, res: Response): Promise<void>;
  getUserGithubRepositories(req: Request, res: Response): Promise<void>;
  
  // Rights management
  updateDeveloperRights(req: Request, res: Response): Promise<void>;
  
  // Service management
  getServices(req: Request, res: Response): Promise<void>;
  createCustomService(req: Request, res: Response): Promise<void>;
  addDeveloperService(req: Request, res: Response): Promise<void>;
  updateDeveloperService(req: Request, res: Response): Promise<void>;
  deleteDeveloperService(req: Request, res: Response): Promise<void>;
  
  // Onboarding completion
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
      
      logger.debug(`Received request body:`, JSON.stringify(req.body));

      const existingProfile = await developerProfileRepo.getByUserId(
        user.id.uuid,
      );
      if (existingProfile) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          "Developer profile already exists",
        );
      }

      // Update user's name and email if provided
      if (profileData.name !== undefined || profileData.email !== undefined) {
        logger.debug(`Updating user name/email: name="${profileData.name}", email="${profileData.email}"`);
        try {
          const updatedUser = await userRepo.updateNameAndEmail(
            user.id,
            profileData.name || user.name,
            profileData.email || userUtils.email(user),
          );
          logger.debug(`User updated successfully: name="${updatedUser.name}", email="${userUtils.email(updatedUser)}"`);
        } catch (error) {
          logger.error('Error updating user name/email:', error);
          // Continue with profile creation even if user update fails
        }
      } else {
        logger.debug('No name/email provided in profileData');
      }

      const profile = await developerProfileRepo.create(
        { onboardingCompleted: profileData.onboardingCompleted || false }, // Only profile-specific data
        user.id.uuid,
      );

      res.status(StatusCodes.CREATED).json({
        success: {
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
        logger.error("Failed to create developer profile:", error);
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
      
      logger.debug(`Received request body:`, JSON.stringify(req.body));

      const existingProfile = await developerProfileRepo.getByUserId(
        user.id.uuid,
      );
      if (!existingProfile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      // Update user's name and email if provided
      if (updates.name !== undefined || updates.email !== undefined) {
        logger.debug(`Updating user name/email: name="${updates.name}", email="${updates.email}"`);
        try {
          const updatedUser = await userRepo.updateNameAndEmail(
            user.id,
            updates.name || user.name,
            updates.email || userUtils.email(user),
          );
          logger.debug(`User updated successfully: name="${updatedUser.name}", email="${userUtils.email(updatedUser)}"`);
        } catch (error) {
          logger.error('Error updating user name/email:', error);
          // Continue with profile update even if user update fails
        }
      } else {
        logger.debug('No name/email provided in updates');
      }

      const updatedProfile = await developerProfileRepo.update(
        existingProfile.id.uuid,
        { onboardingCompleted: updates.onboardingCompleted }, // Only profile-specific data
      );

      res.status(StatusCodes.OK).json({
        success: {
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
        logger.error("Failed to update developer profile:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to update developer profile",
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
      
      // Always return user data, even if no developer profile exists yet
      const responseData: any = {
        user: {
          name: user.name,
          email: userUtils.email(user),
        },
      };

      if (profile) {
        // Profile exists - get additional data
        const settings = await developerSettingsRepo.findByProfileId(profile.id.uuid);
        const rights = await developerRightsRepo.findByProfileId(profile.id.uuid);
        const services = await developerServiceRepo.getByProfileId(profile.id.uuid);

        responseData.profile = {
          id: profile.id.uuid,
          onboardingCompleted: profile.onboardingCompleted,
        };
        responseData.settings = settings;
        responseData.rights = rights;
        responseData.services = services;
      } else {
        // No profile yet - this is normal for new users starting onboarding
        responseData.profile = null;
      }

      res.status(StatusCodes.OK).json({
        success: responseData,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to get developer profile:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get developer profile",
        });
      }
    }
  },

  async setDeveloperSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const settingsData: dto.SetDeveloperSettingsDto = req.body;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const settings = await developerSettingsRepo.upsert(
        profile.id.uuid,
        settingsData.incomeStreams,
        settingsData.hourlyWeeklyCommitment,
        settingsData.openToOtherOpportunity,
        settingsData.hourlyRate,
        settingsData.currency,
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to set developer settings:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to set developer settings",
        });
      }
    }
  },

  async setIncomeStreams(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const { incomeStreams }: dto.SetIncomeStreamsDto = req.body;
      
      logger.debug(`Setting income streams for user ${user.id.uuid}:`, incomeStreams);

      let profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        // Create profile if it doesn't exist yet
        profile = await developerProfileRepo.create(
          { onboardingCompleted: false },
          user.id.uuid,
        );
      }

      // Get existing settings or create partial settings with just income streams
      let existingSettings = await developerSettingsRepo.findByProfileId(profile.id.uuid);
      
      if (existingSettings) {
        // Update existing settings with new income streams
        const settings = await developerSettingsRepo.upsert(
          profile.id.uuid,
          incomeStreams,
          existingSettings.hourlyWeeklyCommitment,
          existingSettings.openToOtherOpportunity,
          existingSettings.hourlyRate,
          existingSettings.currency,
        );
        
        res.status(StatusCodes.OK).json({
          success: {
            incomeStreams: settings.incomeStreams,
            message: "Income streams updated successfully"
          },
        });
      } else {
        // Create partial settings with just income streams for now
        // Use default values for required fields that will be set in later steps
        const settings = await developerSettingsRepo.upsert(
          profile.id.uuid,
          incomeStreams,
          1, // Default weekly commitment - will be updated in step 4
          "maybe" as OpenToOtherOpportunityType, // Default opportunity preference - will be updated in step 4
          0, // Default rate - will be updated in step 4
          "USD" as CurrencyType, // Default currency - will be updated in step 4
        );
        
        res.status(StatusCodes.OK).json({
          success: {
            incomeStreams: settings.incomeStreams,
            message: "Income streams saved successfully"
          },
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to set income streams:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to set income streams",
        });
      }
    }
  },

  async addRepository(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const repoData: dto.AddRepositoryDto = req.body;
      
      logger.debug(`Adding repository for user ${user.id.uuid}:`, JSON.stringify(repoData, null, 2));
      logger.debug(`Roles array:`, repoData.roles);
      logger.debug(`First role value:`, repoData.roles?.[0]);
      logger.debug(`First role type:`, typeof repoData.roles?.[0]);

      let profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        // Create profile if it doesn't exist yet
        profile = await developerProfileRepo.create(
          { onboardingCompleted: false },
          user.id.uuid,
        );
      }

      // 1. Create or update GitHub owner record
      const ownerId = new OwnerId(repoData.githubOwnerLogin, repoData.githubOwnerId);
      const githubOwner = new Owner(
        ownerId,
        OwnerType.Organization, // Default to Organization, could be enhanced
        `https://github.com/${repoData.githubOwnerLogin}`,
        `https://github.com/${repoData.githubOwnerLogin}.png`
      );
      
      logger.debug('Creating/updating GitHub owner:', {
        ownerId: githubOwner.id.login,
        type: githubOwner.type
      });
      await ownerRepo.insertOrUpdate(githubOwner);

      // 2. Create or update GitHub repository record
      const repositoryId = new RepositoryId(ownerId, repoData.githubRepositoryName, repoData.githubRepositoryId);
      const githubRepository = new Repository(
        repositoryId,
        `https://github.com/${repoData.githubOwnerLogin}/${repoData.githubRepositoryName}`,
        undefined // description
      );
      
      logger.debug('Creating/updating GitHub repository:', {
        repositoryName: githubRepository.id.name,
        owner: githubRepository.id.ownerId.login
      });
      await repositoryRepo.insertOrUpdate(githubRepository);

      // 3. Check if project item already exists for this repository
      let projectItem = await projectItemRepo.getByGithubRepository(
        repoData.githubOwnerId,
        repoData.githubRepositoryId,
      );

      // Create project item if it doesn't exist
      if (!projectItem) {
        projectItem = await projectItemRepo.createGithubRepositoryItem(
          null, // No project association yet
          repoData.githubOwnerId,
          repoData.githubOwnerLogin,
          repoData.githubRepositoryId,
          repoData.githubRepositoryName,
        );
      }

      // Create or update developer rights
      const existingRights = await developerRightsRepo.findByProfileAndProjectItem(
        profile.id.uuid,
        projectItem.id,
      );

      if (existingRights) {
        await developerRightsRepo.update(
          existingRights.id,
          repoData.mergeRights,
          repoData.roles,
        );
      } else {
        await developerRightsRepo.create(
          profile.id.uuid,
          projectItem.id,
          repoData.mergeRights,
          repoData.roles,
        );
      }

      // Add services if provided
      if (repoData.services && repoData.services.length > 0) {
        for (const service of repoData.services) {
          await developerServiceRepo.create(
            profile.id.uuid,
            projectItem.id,
            service.serviceId,
            service.hourlyRate,
            service.currency as any,
            service.responseTimeHours,
          );
        }
      }

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          projectItemId: projectItem.id,
          repository: `${repoData.githubOwnerLogin}/${repoData.githubRepositoryName}`,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to add repository:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to add repository",
        });
      }
    }
  },

  async removeRepository(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { projectItemId } = req.params;
      const user = req.user as User;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      // Delete developer rights
      await developerRightsRepo.deleteByProjectItemId(projectItemId);
      
      // Delete developer services
      await developerServiceRepo.deleteByProjectItemId(projectItemId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Repository removed successfully",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to remove repository:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to remove repository",
        });
      }
    }
  },

  async getRepositories(req: Request, res: Response): Promise<void> {
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

      const rights = await developerRightsRepo.findByProfileId(profile.id.uuid);
      
      const repositories = await Promise.all(
        rights.map(async (right) => {
          const projectItem = await projectItemRepo.getById(right.projectItemId);
          const services = await developerServiceRepo.getByProfileAndProjectItem(
            profile.id.uuid,
            right.projectItemId,
          );
          
          return {
            projectItemId: right.projectItemId,
            repository: projectItem ? 
              `${projectItem.githubOwnerLogin}/${projectItem.githubRepositoryName}` : 
              null,
            roles: right.roles,
            mergeRights: right.mergeRights,
            services,
          };
        })
      );

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
        logger.error("Failed to get repositories:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get repositories",
        });
      }
    }
  },

  async getGithubOrganizations(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('getGithubOrganizations called');
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      logger.debug(`Getting GitHub organizations for user: ${user.id.uuid}`);
      
      // Get the GitHub access token for the user
      const accessToken = await ownerRepo.getTokenByUserId(user.id.uuid);
      logger.debug(`GitHub access token for user ${user.id.uuid}: ${accessToken ? 'found' : 'not found'}`);
      if (!accessToken) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "GitHub access token not found. Please re-authenticate with GitHub.",
        );
      }

      logger.debug('Calling GitHub service to get user organizations...');
      const organizations = await githubService.getUserOrganizations(accessToken);
      logger.debug(`GitHub organizations result:`, JSON.stringify(organizations));

      res.status(StatusCodes.OK).json({
        success: {
          data: organizations,
        },
      });
    } catch (error) {
      logger.error("Error in getGithubOrganizations:", error);
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to get GitHub organizations:", error);
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
      
      // Get the GitHub access token for the user
      const accessToken = await ownerRepo.getTokenByUserId(user.id.uuid);
      if (!accessToken) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "GitHub access token not found. Please re-authenticate with GitHub.",
        );
      }

      const repositories = await githubService.getOrganizationRepositories(
        org,
        accessToken,
      );

      res.status(StatusCodes.OK).json({
        success: {
          data: repositories,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to get GitHub repositories:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get GitHub repositories",
        });
      }
    }
  },

  async getUserGithubRepositories(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('getUserGithubRepositories called');
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      logger.debug(`Getting user GitHub repositories for user: ${user.id.uuid}`);
      
      // Get the GitHub access token for the user
      const accessToken = await ownerRepo.getTokenByUserId(user.id.uuid);
      if (!accessToken) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "GitHub access token not found. Please re-authenticate with GitHub.",
        );
      }

      logger.debug('Calling GitHub service to get user repositories...');
      const repositories = await githubService.getUserRepositories(accessToken);
      logger.debug(`GitHub repositories result:`, JSON.stringify(repositories));

      res.status(StatusCodes.OK).json({
        success: {
          data: repositories,
        },
      });
    } catch (error) {
      logger.error("Error in getUserGithubRepositories:", error);
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to get user GitHub repositories:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to get user GitHub repositories",
        });
      }
    }
  },

  async updateDeveloperRights(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;
      const updates: dto.UpdateDeveloperRightsDto = req.body;
      const user = req.user as User;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const rights = await developerRightsRepo.update(
        id,
        updates.mergeRights || [],
        updates.roles || [],
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: rights,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to update developer rights:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to update developer rights",
        });
      }
    }
  },

  async getServices(req: Request, res: Response): Promise<void> {
    try {
      const services = await servicesRepo.getHierarchy();

      res.status(StatusCodes.OK).json({
        success: true,
        data: services,
      });
    } catch (error) {
      logger.error("Failed to get services:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to get services",
      });
    }
  },

  async createCustomService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }
      
      const { name, hasResponseTime } = req.body;
      
      // Create custom service with no parent (null) and isCustom = true
      const service = await servicesRepo.create(
        name,
        null, // parentId - custom services have no parent
        true, // isCustom
        hasResponseTime || false // hasResponseTime
      );
      
      res.status(StatusCodes.CREATED).json({
        success: true,
        data: service,
      });
    } catch (error) {
      logger.error("Failed to create custom service:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to create custom service",
      });
    }
  },

  async addDeveloperService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const user = req.user as User;
      const { projectItemId, serviceId, hourlyRate, currency, responseTimeHours } = req.body;

      const profile = await developerProfileRepo.getByUserId(user.id.uuid);
      if (!profile) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Developer profile not found",
        );
      }

      const service = await developerServiceRepo.create(
        profile.id.uuid,
        projectItemId,
        serviceId,
        hourlyRate,
        currency,
        responseTimeHours,
      );

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: service,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to add developer service:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to add developer service",
        });
      }
    }
  },

  async updateDeveloperService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;
      const { hourlyRate, currency, responseTimeHours } = req.body;

      const service = await developerServiceRepo.update(
        id,
        hourlyRate,
        currency,
        responseTimeHours,
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: service,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to update developer service:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to update developer service",
        });
      }
    }
  },

  async deleteDeveloperService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
      }

      const { id } = req.params;

      await developerServiceRepo.delete(id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Service deleted successfully",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to delete developer service:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to delete developer service",
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

      // Check if all required data is present
      const settings = await developerSettingsRepo.findByProfileId(profile.id.uuid);
      if (!settings) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Developer settings not configured",
        );
      }

      const rights = await developerRightsRepo.findByProfileId(profile.id.uuid);
      if (rights.length === 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "No repositories added",
        );
      }

      // Mark onboarding as completed
      await developerProfileRepo.update(profile.id.uuid, {
        onboardingCompleted: true,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Onboarding completed successfully",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        logger.error("Failed to complete onboarding:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: "Failed to complete onboarding",
        });
      }
    }
  },

};