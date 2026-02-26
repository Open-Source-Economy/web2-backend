import type {
  Sponsor,
  SponsorId,
  StripeCustomerId,
} from "@open-source-economy/api-types";
import { mapOwnerIdFromForeignKey } from "./github/owner.mapper";

export function mapSponsorFromRow(
  row: Record<string, any>,
  prefix = "",
): Sponsor {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const stripeCustomerId = row[`${prefix}stripe_customer_id`];
  if (!stripeCustomerId) throw new Error(`Missing ${prefix}stripe_customer_id`);

  return {
    id: id as SponsorId,
    stripeCustomerId: stripeCustomerId as StripeCustomerId,
    ownerId: mapOwnerIdFromForeignKey(row, prefix),
    isPublic: row[`${prefix}is_public`],
  };
}
