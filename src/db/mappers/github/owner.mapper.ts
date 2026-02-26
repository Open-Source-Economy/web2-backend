import type { Owner, OwnerId, OwnerType } from "@open-source-economy/api-types";

export function mapOwnerIdFromPrimaryKey(
  row: Record<string, any>,
  prefix = "",
): OwnerId {
  const login = row[`${prefix}github_login`];
  if (!login) throw new Error(`Missing ${prefix}github_login`);
  const githubId = row[`${prefix}github_id`] ?? undefined;
  return { login, githubId } as OwnerId;
}

export function mapOwnerIdFromForeignKey(
  row: Record<string, any>,
  prefix = "",
): OwnerId {
  const login = row[`${prefix}github_owner_login`];
  if (!login) throw new Error(`Missing ${prefix}github_owner_login`);
  const githubId = row[`${prefix}github_owner_id`] ?? undefined;
  return { login, githubId } as OwnerId;
}

export function mapOwnerFromRow(row: Record<string, any>, prefix = ""): Owner {
  const id = mapOwnerIdFromPrimaryKey(row, prefix);
  const type = row[`${prefix}github_type`] as OwnerType;
  if (!type) throw new Error(`Missing ${prefix}github_type`);

  return {
    id,
    type,
    htmlUrl: row[`${prefix}github_html_url`],
    avatarUrl: row[`${prefix}github_avatar_url`] ?? undefined,
    followers: row[`${prefix}github_followers`] ?? undefined,
    following: row[`${prefix}github_following`] ?? undefined,
    publicRepos: row[`${prefix}github_public_repos`] ?? undefined,
    publicGists: row[`${prefix}github_public_gists`] ?? undefined,
    name: row[`${prefix}github_name`] ?? undefined,
    twitterUsername: row[`${prefix}github_twitter_username`] ?? undefined,
    company: row[`${prefix}github_company`] ?? undefined,
    blog: row[`${prefix}github_blog`] ?? undefined,
    location: row[`${prefix}github_location`] ?? undefined,
    email: row[`${prefix}github_email`] ?? undefined,
  };
}
