import {
  ProjectCategory,
  ProjectItem,
  ProjectItemId,
  ProjectItemType,
  SourceIdentifier,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { OwnerIdCompanion } from "../github/Owner.companion";
import { RepositoryIdCompanion } from "../github/Repository.companion";

export namespace ProjectItemCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): ProjectItem | ValidationError {
    const validator = new Validator(row);

    const idString = validator.requiredString(`${table_prefix}id`);
    const projectItemType = validator.requiredEnum(
      `${table_prefix}project_item_type`,
      Object.values(ProjectItemType) as ProjectItemType[],
    );
    const categories = validator.optionalArrayOfEnums(
      `${table_prefix}categories`,
      Object.values(ProjectCategory) as ProjectCategory[],
    );
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const updatedAt = validator.requiredDate(`${table_prefix}updated_at`);

    let error = validator.getFirstError();
    if (error) {
      return error;
    }

    let sourceIdentifier: SourceIdentifier;

    switch (projectItemType) {
      case ProjectItemType.GITHUB_OWNER:
        const ownerId = OwnerIdCompanion.fromBackendForeignKey(
          row,
          table_prefix,
        );
        if (ownerId instanceof ValidationError) {
          return ownerId;
        }
        sourceIdentifier = ownerId;
        break;

      case ProjectItemType.GITHUB_REPOSITORY:
        const repositoryId = RepositoryIdCompanion.fromBackendForeignKey(
          row,
          table_prefix,
        );
        if (repositoryId instanceof ValidationError) {
          return repositoryId;
        }
        sourceIdentifier = repositoryId;
        break;

      case ProjectItemType.URL:
        // For URL type, directly validate and use the string
        const urlString = validator.requiredString(`${table_prefix}url`);
        error = validator.getFirstError();
        if (error) {
          return error;
        }
        sourceIdentifier = urlString;
        break;
      default:
        return new ValidationError(
          `Invalid project item type: ${projectItemType}`,
          row,
        );
    }

    return {
      id: new ProjectItemId(idString),
      projectItemType: projectItemType,
      sourceIdentifier,
      categories: categories,
      createdAt: createdAt,
      updatedAt: updatedAt,
    };
  }
}
