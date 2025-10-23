import {
  DeveloperProfileId,
  DeveloperProjectItem,
  DeveloperProjectItemId,
  DeveloperRoleType,
  MergeRightsType,
  ProjectItemId,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

export namespace DeveloperProjectItemCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): DeveloperProjectItem | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const developerProfileId = validator.requiredString(
      `${table_prefix}developer_profile_id`,
    );
    const projectItemId = validator.requiredString(
      `${table_prefix}project_item_id`,
    );
    const roles = validator.requiredArrayOfEnums(
      `${table_prefix}roles`,
      Object.values(DeveloperRoleType) as DeveloperRoleType[],
    );
    const mergeRights = validator.requiredArrayOfEnums(
      `${table_prefix}merge_rights`,
      Object.values(MergeRightsType) as MergeRightsType[],
    );
    const comment = validator.optionalString(`${table_prefix}comment`);
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const updatedAt = validator.requiredDate(`${table_prefix}updated_at`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: new DeveloperProjectItemId(id),
      developerProfileId: new DeveloperProfileId(developerProfileId),
      projectItemId: new ProjectItemId(projectItemId),
      roles,
      mergeRights,
      comment,
      createdAt,
      updatedAt,
    };
  }
}
