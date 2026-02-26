import type {
  DeveloperProjectItem,
  DeveloperProjectItemId,
  DeveloperProfileId,
  ProjectItemId,
  DeveloperRoleType,
  MergeRightsType,
  ProjectCategory,
} from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";

export function mapDeveloperProjectItemFromRow(
  row: Record<string, any>,
  prefix = "",
): DeveloperProjectItem {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const developerProfileId = row[`${prefix}developer_profile_id`];
  if (!developerProfileId)
    throw new Error(`Missing ${prefix}developer_profile_id`);

  const projectItemId = row[`${prefix}project_item_id`];
  if (!projectItemId) throw new Error(`Missing ${prefix}project_item_id`);

  const createdAt = row[`${prefix}created_at`];
  if (!createdAt) throw new Error(`Missing ${prefix}created_at`);
  const updatedAt = row[`${prefix}updated_at`];
  if (!updatedAt) throw new Error(`Missing ${prefix}updated_at`);

  return {
    id: id as DeveloperProjectItemId,
    developerProfileId: developerProfileId as DeveloperProfileId,
    projectItemId: projectItemId as ProjectItemId,
    roles: row[`${prefix}roles`] as DeveloperRoleType[],
    mergeRights: row[`${prefix}merge_rights`] as MergeRightsType[],
    comment: row[`${prefix}comment`] ?? undefined,
    customCategories: row[`${prefix}custom_categories`] ?? undefined,
    predefinedCategories:
      (row[`${prefix}predefined_categories`] as ProjectCategory[]) ?? undefined,
    createdAt: toISODateTimeString(new Date(createdAt)),
    updatedAt: toISODateTimeString(new Date(updatedAt)),
  };
}

export interface MergeRolesAndRightsResult {
  hasChanges: boolean;
  mergedRoles: DeveloperRoleType[];
  mergedMergeRights: MergeRightsType[];
  addedRoles: DeveloperRoleType[];
  addedMergeRights: MergeRightsType[];
}

export function mergeRolesAndRights(
  existingRoles: DeveloperRoleType[],
  existingMergeRights: MergeRightsType[],
  newRoles: DeveloperRoleType[],
  newMergeRights: MergeRightsType[],
): MergeRolesAndRightsResult {
  const existingRolesSet = new Set(existingRoles);
  const existingMergeRightsSet = new Set(existingMergeRights);

  const addedRoles = newRoles.filter((role) => !existingRolesSet.has(role));
  const addedMergeRights = newMergeRights.filter(
    (right) => !existingMergeRightsSet.has(right),
  );

  const hasChanges = addedRoles.length > 0 || addedMergeRights.length > 0;

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
