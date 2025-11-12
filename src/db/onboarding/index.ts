import { getDeveloperProfileRepository } from "./DeveloperProfile.repository";
import { getDeveloperProjectItemRepository } from "./DeveloperProjectItemRepository";
import { getDeveloperSettingsRepository } from "./DeveloperSettings.repository";
import { getDeveloperServiceRepository } from "./DeveloperService.repository";

export const developerProfileRepo = getDeveloperProfileRepository();
export const developerProjectItemRepo = getDeveloperProjectItemRepository();
export const developerSettingsRepo = getDeveloperSettingsRepository();
export const developerServiceRepo = getDeveloperServiceRepository();

export * from "./DeveloperProfile.repository";
export * from "./DeveloperSettings.repository";
export * from "./DeveloperProjectItemRepository";
export * from "./DeveloperService.repository";
