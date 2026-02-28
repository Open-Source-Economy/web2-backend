import type {
  RepositoryUserPermissionToken,
  RepositoryUserPermissionTokenId,
  RepositoryUserRole,
  Currency,
} from "@open-source-economy/api-types";
import { toISODateTimeString } from "../../../utils/date.utils";
import { mapRepositoryIdFromForeignKey } from "../github/repository.mapper";

export function mapRepositoryUserPermissionTokenFromRow(
  row: Record<string, any>,
  prefix = ""
): RepositoryUserPermissionToken {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const token = row[`${prefix}token`];
  if (!token) throw new Error(`Missing ${prefix}token`);

  const expiresAt = row[`${prefix}expires_at`];
  if (!expiresAt) throw new Error(`Missing ${prefix}expires_at`);

  return {
    id: id as RepositoryUserPermissionTokenId,
    userName: row[`${prefix}user_name`] ?? null,
    userEmail: row[`${prefix}user_email`] ?? null,
    userGithubOwnerLogin: row[`${prefix}user_github_owner_login`],
    token,
    repositoryId: mapRepositoryIdFromForeignKey(row, prefix),
    repositoryUserRole: row[`${prefix}repository_user_role`] as RepositoryUserRole,
    rate: row[`${prefix}rate`] != null ? Number(row[`${prefix}rate`]) : null,
    currency: (row[`${prefix}currency`] as Currency) ?? null,
    expiresAt: toISODateTimeString(new Date(expiresAt)),
    hasBeenUsed: row[`${prefix}has_been_used`],
  };
}
