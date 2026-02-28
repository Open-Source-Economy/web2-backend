import type { IssueFunding, IssueFundingId, UserId } from "@open-source-economy/api-types";
import { mapIssueIdFromForeignKey } from "../github/issue.mapper";

export function mapIssueFundingFromRow(row: Record<string, any>, prefix = ""): IssueFunding {
  const id = row[`${prefix}id`];
  if (!id) throw new Error(`Missing ${prefix}id`);

  const userId = row[`${prefix}user_id`];
  if (!userId) throw new Error(`Missing ${prefix}user_id`);

  const credit = row[`${prefix}credit_amount`];
  if (credit == null) throw new Error(`Missing ${prefix}credit_amount`);

  return {
    id: id as IssueFundingId,
    githubIssueId: mapIssueIdFromForeignKey(row, prefix),
    userId: userId as UserId,
    credit,
  };
}
