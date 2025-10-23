import {
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
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const updatedAt = validator.requiredDate(`${table_prefix}updated_at`);

    let error = validator.getFirstError();
    if (error) {
      return error;
    }

    let sourceIdentifier: SourceIdentifier;

    switch (projectItemType) {
      case ProjectItemType.GITHUB_OWNER:
        const ownerIdResult = OwnerIdCompanion.fromBackendForeignKey(
          row,
          table_prefix,
        );
        if (ownerIdResult instanceof ValidationError) {
          return ownerIdResult;
        }
        sourceIdentifier = ownerIdResult;
        break;

      case ProjectItemType.GITHUB_REPOSITORY:
        const repositoryIdResult = RepositoryIdCompanion.fromBackendForeignKey(
          row,
          table_prefix,
        );
        if (repositoryIdResult instanceof ValidationError) {
          return repositoryIdResult;
        }
        sourceIdentifier = repositoryIdResult;
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
      createdAt: createdAt,
      updatedAt: updatedAt,
    };
  }
}
