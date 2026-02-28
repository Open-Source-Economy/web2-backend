import {
  DeveloperProfileId,
  DeveloperProjectItem,
  DeveloperProjectItemId,
  DeveloperRoleType,
  ISODateTimeString,
  MergeRightsType,
  ProjectCategory,
  ProjectItemId,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";

export interface MergeRolesAndRightsResult {
  hasChanges: boolean;
  mergedRoles: DeveloperRoleType[];
  mergedMergeRights: MergeRightsType[];
  addedRoles: DeveloperRoleType[];
  addedMergeRights: MergeRightsType[];
}

export namespace DeveloperProjectItemCompanion {
  export function fromBackend(row: any, table_prefix: string = ""): DeveloperProjectItem | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const developerProfileId = validator.requiredString(`${table_prefix}developer_profile_id`);
    const projectItemId = validator.requiredString(`${table_prefix}project_item_id`);
    const roles = validator.requiredArrayOfEnums(
      `${table_prefix}roles`,
      Object.values(DeveloperRoleType) as DeveloperRoleType[]
    );
    const mergeRights = validator.requiredArrayOfEnums(
      `${table_prefix}merge_rights`,
      Object.values(MergeRightsType) as MergeRightsType[]
    );
    const comment = validator.optionalString(`${table_prefix}comment`);
    const customCategories = validator.optionalArray(`${table_prefix}custom_categories`);
    const predefinedCategories = validator.optionalArrayOfEnums(
      `${table_prefix}predefined_categories`,
      Object.values(ProjectCategory) as ProjectCategory[]
    );
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const updatedAt = validator.requiredDate(`${table_prefix}updated_at`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as DeveloperProjectItemId,
      developerProfileId: developerProfileId as DeveloperProfileId,
      projectItemId: projectItemId as ProjectItemId,
      roles,
      mergeRights,
      comment,
      customCategories: customCategories,
      predefinedCategories: predefinedCategories,
      createdAt: createdAt as ISODateTimeString,
      updatedAt: updatedAt as ISODateTimeString,
    } as DeveloperProjectItem;
  }

  /**
   * Merges developer roles and merge rights, avoiding duplicates.
   *
   * @param existingRoles - The existing roles of the developer
   * @param existingMergeRights - The existing merge rights of the developer
   * @param newRoles - The new roles to merge
   * @param newMergeRights - The new merge rights to merge
   * @returns MergeRolesAndRightsResult containing the merged data and information about changes
   */
  export function mergeRolesAndRights(
    existingRoles: DeveloperRoleType[],
    existingMergeRights: MergeRightsType[],
    newRoles: DeveloperRoleType[],
    newMergeRights: MergeRightsType[]
  ): MergeRolesAndRightsResult {
    const existingRolesSet = new Set(existingRoles);
    const existingMergeRightsSet = new Set(existingMergeRights);

    // Find new roles and merge rights that aren't already present
    const addedRoles = newRoles.filter((role) => !existingRolesSet.has(role));
    const addedMergeRights = newMergeRights.filter((right) => !existingMergeRightsSet.has(right));

    // Check if there are any changes
    const hasChanges = addedRoles.length > 0 || addedMergeRights.length > 0;

    // Merge the new items into existing sets
    addedRoles.forEach((role) => existingRolesSet.add(role));
    addedMergeRights.forEach((right) => existingMergeRightsSet.add(right));

    return {
      hasChanges,
      mergedRoles: Array.from(existingRolesSet),
      mergedMergeRights: Array.from(existingMergeRightsSet),
      addedRoles,
      addedMergeRights,
    };
  }
}
