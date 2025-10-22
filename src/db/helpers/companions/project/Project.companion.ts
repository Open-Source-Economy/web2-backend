import {
  Project,
  Repository,
  ProjectEcosystem,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { OwnerCompanion, RepositoryCompanion } from "../github";

export namespace ProjectCompanion {
  export function fromBackend(
    row: any,
    owner_table_prefix: string,
    repository_prefix: string,
  ): Project | ValidationError {
    const validator = new Validator(row);

    // Get the ecosystem
    const ecosystem = validator.optionalEnum(
      "ecosystem",
      Object.values(ProjectEcosystem) as ProjectEcosystem[],
    );

    const owner = OwnerCompanion.fromBackend(row, owner_table_prefix);
    const repository = RepositoryCompanion.fromBackend(row, repository_prefix);

    const error = validator.getFirstError();
    if (error) return error;
    if (owner instanceof ValidationError) return owner;

    return new Project(
      owner,
      repository instanceof Repository ? repository : undefined,
      ecosystem,
    );
  }
}
