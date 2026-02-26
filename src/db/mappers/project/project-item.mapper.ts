import type {
  ProjectItem,
  ProjectItemId,
  ProjectItemType,
  ProjectCategory,
  ISODateTimeString,
} from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";
import { mapOwnerIdFromForeignKey } from "../github/owner.mapper";
import { mapRepositoryIdFromForeignKey } from "../github/repository.mapper";

export function mapProjectItemFromRow(
  row: Record<string, any>,
  prefix = "",
): ProjectItem {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const projectItemType = row[`${prefix}project_item_type`] as ProjectItemType;
  if (!projectItemType) throw new Error(`Missing ${prefix}project_item_type`);

  let sourceIdentifier: string;
  switch (projectItemType) {
    case "GITHUB_OWNER": {
      const ownerId = mapOwnerIdFromForeignKey(row, prefix);
      sourceIdentifier = ownerId.login;
      break;
    }
    case "GITHUB_REPOSITORY": {
      const repoId = mapRepositoryIdFromForeignKey(row, prefix);
      sourceIdentifier = `${repoId.ownerId.login}/${repoId.name}`;
      break;
    }
    case "URL": {
      sourceIdentifier = row[`${prefix}url`];
      if (!sourceIdentifier) throw new Error(`Missing ${prefix}url`);
      break;
    }
    default:
      throw new Error(`Invalid project item type: ${projectItemType}`);
  }

  const createdAt = row[`${prefix}created_at`];
  if (!createdAt) throw new Error(`Missing ${prefix}created_at`);
  const updatedAt = row[`${prefix}updated_at`];
  if (!updatedAt) throw new Error(`Missing ${prefix}updated_at`);

  return {
    id: id as ProjectItemId,
    projectItemType,
    sourceIdentifier,
    categories: (row[`${prefix}categories`] as ProjectCategory[]) ?? undefined,
    createdAt: toISODateTimeString(new Date(createdAt)),
    updatedAt: toISODateTimeString(new Date(updatedAt)),
  };
}
