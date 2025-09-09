import {
  OwnerId,
  ProjectItem,
  ProjectItemId,
  ProjectItemType,
  RepositoryId,
  SourceIdentifier,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

export namespace ProjectItemCompanion {
  export function fromBackend(row: any): ProjectItem | ValidationError {
    const validator = new Validator(row);

    const idString = validator.requiredString("id");
    const projectItemType = validator.requiredEnum(
      "project_item_type",
      Object.values(ProjectItemType) as ProjectItemType[],
    );
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    let error = validator.getFirstError();
    if (error) {
      return error;
    }

    let sourceIdentifier: SourceIdentifier;

    switch (projectItemType) {
      case ProjectItemType.GITHUB_OWNER:
        const ownerIdResult = OwnerId.fromBackendForeignKey(row);
        if (ownerIdResult instanceof ValidationError) {
          return ownerIdResult;
        }
        sourceIdentifier = ownerIdResult;
        break;

      case ProjectItemType.GITHUB_REPOSITORY:
        const repositoryIdResult = RepositoryId.fromBackendForeignKey(row);
        if (repositoryIdResult instanceof ValidationError) {
          return repositoryIdResult;
        }
        sourceIdentifier = repositoryIdResult;
        break;

      case ProjectItemType.URL:
        // For URL type, directly validate and use the string
        const urlString = validator.requiredString("url");
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
