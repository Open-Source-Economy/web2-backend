import {
  OwnerId,
  ProductType,
  RepositoryId,
  StripeProduct,
  StripeProductId,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";
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

    let projectId: OwnerId | RepositoryId | null | ValidationError = null;
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

    // StripeProduct.projectId is now a string | null
    // Serialize the project ID to a string representation
    let projectIdStr: string | null = null;
    if (projectId !== null) {
      if ("name" in projectId) {
        // It's a RepositoryId
        projectIdStr = `${(projectId as RepositoryId).ownerId.login}/${(projectId as RepositoryId).name}`;
      } else {
        // It's an OwnerId
        projectIdStr = (projectId as OwnerId).login;
      }
    }

    return {
      stripeId: stripeId as StripeProductId,
      projectId: projectIdStr,
      type,
    } as StripeProduct;
  }
}
