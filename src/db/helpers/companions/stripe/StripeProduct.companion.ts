import {
  StripeProduct,
  StripeProductId,
  ProductType,
  ProjectId,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { OwnerIdCompanion, RepositoryIdCompanion } from "../github";

export namespace StripeProductCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): StripeProduct | ValidationError {
    const validator = new Validator(row);
    const stripeId = validator.requiredString(`${table_prefix}stripe_id`);
    const type = validator.requiredEnum(
      `${table_prefix}type`,
      Object.values(ProductType) as ProductType[],
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    let projectId: ProjectId | null | ValidationError = null;
    if (row[`${table_prefix}github_repository_name`]) {
      projectId = RepositoryIdCompanion.fromBackendForeignKey(
        row,
        table_prefix,
      );
    } else {
      projectId = OwnerIdCompanion.fromBackendForeignKey(row, table_prefix);
    }

    // TODO: Implement the optionality properly
    if (projectId instanceof ValidationError) {
      projectId = null;
    }

    return new StripeProduct(new StripeProductId(stripeId), projectId, type);
  }
}
