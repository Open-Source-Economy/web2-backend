import {
  ManagedIssue,
  ManagedIssueId,
  UserId,
  ContributorVisibility,
  ManagedIssueState,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { IssueIdCompanion } from "./github";

export namespace ManagedIssueCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): ManagedIssue | ValidationError {
    const githubIssueId = IssueIdCompanion.fromBackendForeignKey(
      row,
      table_prefix,
    );
    if (githubIssueId instanceof ValidationError) {
      return githubIssueId;
    }

    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const requestedCreditAmount = validator.optionalNumber(
      `${table_prefix}requested_credit_amount`,
    );
    const managerId = validator.requiredString(`${table_prefix}manager_id`);
    const contributorVisibility = validator.requiredEnum(
      `${table_prefix}contributor_visibility`,
      Object.values(ContributorVisibility) as ContributorVisibility[],
    );
    const state = validator.requiredEnum(
      `${table_prefix}state`,
      Object.values(ManagedIssueState) as ManagedIssueState[],
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new ManagedIssue(
      new ManagedIssueId(id),
      githubIssueId,
      requestedCreditAmount ?? null,
      new UserId(managerId),
      contributorVisibility,
      state,
    );
  }
}
