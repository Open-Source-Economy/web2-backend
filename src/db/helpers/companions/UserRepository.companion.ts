import {
  Currency,
  RepositoryUserRole,
  UserId,
  UserRepository,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { RepositoryIdCompanion } from "./github";

export namespace UserRepositoryCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): UserRepository | ValidationError {
    const validator = new Validator(row);
    const userId = validator.requiredString(`${table_prefix}user_id`);
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

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new UserRepository(
      new UserId(userId),
      repositoryId,
      repositoryUserRole,
      rate ?? null,
      currency ?? null,
    );
  }
}
