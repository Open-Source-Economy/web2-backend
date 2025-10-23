import {
  Currency,
  RepositoryUserPermissionToken,
  RepositoryUserPermissionTokenId,
  RepositoryUserRole,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { RepositoryIdCompanion } from "./github";

export namespace RepositoryUserPermissionTokenCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): RepositoryUserPermissionToken | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const userName = validator.optionalString(`${table_prefix}user_name`);
    const userEmail = validator.optionalString(`${table_prefix}user_email`);
    const userGithubOwnerLogin = validator.requiredString(
      `${table_prefix}user_github_owner_login`,
    );
    const token = validator.requiredString(`${table_prefix}token`);
    const repositoryId = RepositoryIdCompanion.fromBackendForeignKey(
      row,
      table_prefix,
    );
    if (repositoryId instanceof ValidationError) {
      return repositoryId;
    }
    const repositoryUserRole = validator.requiredEnum(
      `${table_prefix}repository_user_role`,
      Object.values(RepositoryUserRole) as RepositoryUserRole[],
    );
    const rate = validator.optionalDecimal(`${table_prefix}rate`);
    const currency = validator.optionalEnum(
      `${table_prefix}currency`,
      Object.values(Currency) as Currency[],
    );
    const expiresAt = validator.requiredDate(`${table_prefix}expires_at`);
    const hasBeenUsed = validator.requiredBoolean(
      `${table_prefix}has_been_used`,
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new RepositoryUserPermissionToken(
      new RepositoryUserPermissionTokenId(id),
      userName ?? null,
      userEmail ?? null,
      userGithubOwnerLogin,
      token,
      repositoryId,
      repositoryUserRole,
      rate ?? null,
      currency ?? null,
      expiresAt,
      hasBeenUsed,
    );
  }
}
