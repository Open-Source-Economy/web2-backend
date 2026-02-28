import type { ManagedIssue, ManagedIssueId, UserId } from "@open-source-economy/api-types";
import { ContributorVisibility, ManagedIssueState } from "@open-source-economy/api-types";
import { mapIssueIdFromForeignKey } from "../github/issue.mapper";
import { requireEnum } from "../../../utils/enum-utils";

export function mapManagedIssueFromRow(row: Record<string, any>, prefix = ""): ManagedIssue {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const managerId = row[`${prefix}manager_id`];
  if (!managerId) throw new Error(`Missing ${prefix}manager_id`);

  const contributorVisibility = requireEnum(
    row[`${prefix}contributor_visibility`],
    Object.values(ContributorVisibility),
    "managed_issue.contributor_visibility"
  );

  const state = requireEnum(row[`${prefix}state`], Object.values(ManagedIssueState), "managed_issue.state");

  return {
    id: id as ManagedIssueId,
    githubIssueId: mapIssueIdFromForeignKey(row, prefix),
    requestedCreditAmount: row[`${prefix}requested_credit_amount`] ?? null,
    managerId: managerId as UserId,
    contributorVisibility,
    state,
  };
}
