import type { UserRepository, UserId, RepositoryUserRole, Currency } from "@open-source-economy/api-types";
import { mapRepositoryIdFromForeignKey } from "../github/repository.mapper";

export function mapUserRepositoryFromRow(row: Record<string, any>, prefix = ""): UserRepository {
  const userId = row[`${prefix}user_id`];
  if (!userId) throw new Error(`Missing ${prefix}user_id`);

  return {
    userId: userId as UserId,
    repositoryId: mapRepositoryIdFromForeignKey(row, prefix),
    repositoryUserRole: row[`${prefix}repository_user_role`] as RepositoryUserRole,
    rate: row[`${prefix}rate`] != null ? Number(row[`${prefix}rate`]) : null,
    currency: (row[`${prefix}currency`] as Currency) ?? null,
  };
}
