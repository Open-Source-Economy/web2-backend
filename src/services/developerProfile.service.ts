import * as dto from "@open-source-economy/api-types";
import { Pool } from "pg";
import {
  getDeveloperProfileRepository,
  getDeveloperProjectItemRepository,
  getDeveloperServiceRepository,
  getDeveloperSettingsRepository,
  getProjectItemRepository,
  getServiceRepository,
} from "../db";
import { createVerificationRecordRepository } from "../db/onboarding/VerificationRecord.repository";

/**
 * Service for building full developer profiles with all related data
 * Used by both onboarding and admin controllers
 */
export class DeveloperProfileService {
  private developerProfileRepo = getDeveloperProfileRepository();
  private developerProjectItemRepo = getDeveloperProjectItemRepository();
  private developerServiceRepo = getDeveloperServiceRepository();
  private developerSettingsRepo = getDeveloperSettingsRepository();
  private projectItemRepo = getProjectItemRepository();
  private serviceRepo = getServiceRepository();
  private verificationRecordRepo;

  constructor(pool: Pool) {
    this.verificationRecordRepo = createVerificationRecordRepository(pool);
  }

  /**
   * Build a complete FullDeveloperProfile with all related entities
   * including verification records
   */
  async buildFullDeveloperProfile(
    developerProfile: dto.DeveloperProfile,
  ): Promise<dto.FullDeveloperProfile> {
    const user = await this.developerProfileRepo.getById(
      developerProfile.userId,
    );
    const settings = await this.developerSettingsRepo.findByProfileId(
      developerProfile.id,
    );

    const developerProjectItems =
      await this.developerProjectItemRepo.findByProfileId(developerProfile.id);

    const projects: dto.DeveloperProjectItemEntry[] = [];
    for (const dpi of developerProjectItems) {
      const projectItem = await this.projectItemRepo.getById(dpi.projectItemId);
      if (projectItem) {
        // Fetch verification records for this project item
        const projectVerificationRecords =
          await this.verificationRecordRepo.findAllByEntity(
            dto.VerificationEntityType.DEVELOPER_PROJECT_ITEM,
            dpi.id.uuid,
          );

        projects.push({
          projectItem,
          developerProjectItem: dpi,
          verificationRecords: projectVerificationRecords,
        });
      }
    }

    const developerServices = await this.developerServiceRepo.getByProfileId(
      developerProfile.id,
    );

    const services: dto.DeveloperServiceEntry[] = [];
    for (const ds of developerServices) {
      const service = await this.serviceRepo.findById(ds.serviceId);
      if (service) {
        services.push({
          service,
          developerService: ds,
        });
      }
    }

    // Fetch verification records for the profile and create profile entry
    const profileVerificationRecords =
      await this.verificationRecordRepo.findAllByEntity(
        dto.VerificationEntityType.DEVELOPER_PROFILE,
        developerProfile.id.uuid,
      );

    // Extract Owner from user data (if it's a GitHub user)
    let owner: dto.Owner | null = null;
    if ("providerData" in user.data) {
      owner = user.data.providerData.owner;
    }

    const profileEntry: dto.DeveloperProfileEntry = {
      profile: developerProfile,
      owner: owner,
      verificationRecords: profileVerificationRecords,
    };

    return {
      name: user.name,
      contactEmail: developerProfile.contactEmail,
      agreedToTerms: user.termsAcceptedVersion !== null,
      profileEntry: profileEntry,
      settings: settings || null,
      projects: projects,
      services: services,
    };
  }
}
