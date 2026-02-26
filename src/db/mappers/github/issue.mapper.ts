import type {
  Issue,
  IssueId,
  OwnerId,
  ISODateTimeString,
} from "@open-source-economy/api-types";
import { mapRepositoryIdFromForeignKey } from "./repository.mapper";
import { toISODateTimeString } from "../../../utils/date.utils";

export function mapIssueIdFromRow(
  row: Record<string, any>,
  prefix = "",
): IssueId {
  const repositoryId = mapRepositoryIdFromForeignKey(row, prefix);
  const number = row[`${prefix}github_number`];
  if (number == null) throw new Error(`Missing ${prefix}github_number`);
  const githubId = row[`${prefix}github_id`] ?? undefined;

  return { repositoryId, number, githubId };
}

export function mapIssueIdFromForeignKey(
  row: Record<string, any>,
  prefix = "",
): IssueId {
  const repositoryId = mapRepositoryIdFromForeignKey(row, prefix);
  const number = row[`${prefix}github_issue_number`];
  if (number == null) throw new Error(`Missing ${prefix}github_issue_number`);
  const githubId = row[`${prefix}github_issue_id`] ?? undefined;

  return { repositoryId, number, githubId };
}

export function mapIssueFromRow(row: Record<string, any>, prefix = ""): Issue {
  const ownerLogin = row[`${prefix}github_owner_login`];
  if (!ownerLogin) throw new Error(`Missing ${prefix}github_owner_login`);

  const repoName = row[`${prefix}github_repository_name`];
  if (!repoName) throw new Error(`Missing ${prefix}github_repository_name`);

  const number = row[`${prefix}github_number`];
  if (number == null) throw new Error(`Missing ${prefix}github_number`);

  const id: IssueId = {
    repositoryId: {
      ownerId: ownerLogin as OwnerId,
      name: repoName,
      githubId: row[`${prefix}github_repository_id`] ?? undefined,
    },
    number,
    githubId: row[`${prefix}github_id`] ?? undefined,
  };

  const openByLogin = row[`${prefix}github_open_by_owner_login`];
  if (!openByLogin)
    throw new Error(`Missing ${prefix}github_open_by_owner_login`);

  const createdAtRaw = row[`${prefix}github_created_at`];
  if (!createdAtRaw) throw new Error(`Missing ${prefix}github_created_at`);

  const closedAtRaw = row[`${prefix}github_closed_at`];

  return {
    id,
    title: row[`${prefix}github_title`],
    htmlUrl: row[`${prefix}github_html_url`],
    createdAt: toISODateTimeString(new Date(createdAtRaw)),
    closedAt: closedAtRaw ? toISODateTimeString(new Date(closedAtRaw)) : null,
    openBy: openByLogin as OwnerId,
    body: row[`${prefix}github_body`] ?? undefined,
  };
}
