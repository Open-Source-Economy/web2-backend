import type {
  StripeProduct,
  StripeProductId,
  ProductType,
} from "@open-source-economy/api-types";
import { mapOwnerIdFromForeignKey } from "../github/owner.mapper";
import { mapRepositoryIdFromForeignKey } from "../github/repository.mapper";

export function mapStripeProductFromRow(
  row: Record<string, any>,
  prefix = "",
): StripeProduct {
  const stripeId = row[`${prefix}stripe_id`];
  if (!stripeId) throw new Error(`Missing ${prefix}stripe_id`);

  const type = row[`${prefix}type`] as ProductType;
  if (!type) throw new Error(`Missing ${prefix}type`);

  let projectId: string | null = null;
  try {
    if (row[`${prefix}github_repository_name`]) {
      const repoId = mapRepositoryIdFromForeignKey(row, prefix);
      projectId = `${repoId.ownerId.login}/${repoId.name}`;
    } else {
      const ownerId = mapOwnerIdFromForeignKey(row, prefix);
      projectId = ownerId.login;
    }
  } catch {
    projectId = null;
  }

  return {
    stripeId: stripeId as StripeProductId,
    projectId,
    type,
  };
}
