import { Project } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";
import { OwnerCompanion, RepositoryCompanion } from "../github";

export namespace ProjectCompanion {
  export function fromBackend(
    row: any,
    owner_table_prefix: string,
    repository_prefix: string
  ): Project | ValidationError {
    const validator = new Validator(row);

    const owner = OwnerCompanion.fromBackend(row, owner_table_prefix);
    const repository = RepositoryCompanion.fromBackend(row, repository_prefix);

    const error = validator.getFirstError();
    if (error) return error;
    if (owner instanceof ValidationError) return owner;

    return {
      owner,
      repository: repository instanceof ValidationError ? undefined : repository,
    } as Project;
  }
}
