import type { Repository, RepositoryId } from "@open-source-economy/api-types";
import { mapOwnerIdFromForeignKey } from "./owner.mapper";

export function mapRepositoryIdFromPrimaryKey(row: Record<string, any>, prefix = ""): RepositoryId {
  const ownerId = mapOwnerIdFromForeignKey(row, prefix);
  const name = row[`${prefix}github_name`];
  if (!name) throw new Error(`Missing ${prefix}github_name`);
  const githubId = row[`${prefix}github_id`] ?? undefined;

  return { ownerId, name, githubId };
}

export function mapRepositoryIdFromForeignKey(row: Record<string, any>, prefix = ""): RepositoryId {
  const ownerId = mapOwnerIdFromForeignKey(row, prefix);
  const name = row[`${prefix}github_repository_name`];
  if (!name) throw new Error(`Missing ${prefix}github_repository_name`);
  const githubId = row[`${prefix}github_repository_id`] ?? undefined;

  return { ownerId, name, githubId };
}

export function mapRepositoryFromRow(row: Record<string, any>, prefix = ""): Repository {
  const id = mapRepositoryIdFromPrimaryKey(row, prefix);

  return {
    id,
    htmlUrl: row[`${prefix}github_html_url`] ?? null,
    description: row[`${prefix}github_description`] ?? undefined,
    homepage: row[`${prefix}github_homepage`] ?? undefined,
    language: row[`${prefix}github_language`] ?? undefined,
    forksCount: row[`${prefix}github_forks_count`] ?? undefined,
    stargazersCount: row[`${prefix}github_stargazers_count`] ?? undefined,
    watchersCount: row[`${prefix}github_watchers_count`] ?? undefined,
    fullName: row[`${prefix}github_full_name`] ?? undefined,
    fork: row[`${prefix}github_fork`] ?? undefined,
    topics: row[`${prefix}github_topics`] ?? undefined,
    openIssuesCount: row[`${prefix}github_open_issues_count`] ?? undefined,
    visibility: row[`${prefix}github_visibility`] ?? undefined,
    subscribersCount: row[`${prefix}github_subscribers_count`] ?? undefined,
    networkCount: row[`${prefix}github_network_count`] ?? undefined,
  };
}
