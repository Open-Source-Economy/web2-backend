import type {
  ManagedIssue,
  ManagedIssueId,
  UserId,
  ContributorVisibility,
  ManagedIssueState,
} from "@open-source-economy/api-types";
import { mapIssueIdFromForeignKey } from "../github/issue.mapper";

export function mapManagedIssueFromRow(
  row: Record<string, any>,
  prefix = "",
): ManagedIssue {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const managerId = row[`${prefix}manager_id`];
  if (!managerId) throw new Error(`Missing ${prefix}manager_id`);

  const contributorVisibility = row[
    `${prefix}contributor_visibility`
  ] as ContributorVisibility;
  if (!contributorVisibility)
    throw new Error(`Missing ${prefix}contributor_visibility`);

  const state = row[`${prefix}state`] as ManagedIssueState;
  if (!state) throw new Error(`Missing ${prefix}state`);

  return {
    id: id as ManagedIssueId,
    githubIssueId: mapIssueIdFromForeignKey(row, prefix),
    requestedCreditAmount: row[`${prefix}requested_credit_amount`] ?? null,
    managerId: managerId as UserId,
    contributorVisibility,
    state,
  };
}
