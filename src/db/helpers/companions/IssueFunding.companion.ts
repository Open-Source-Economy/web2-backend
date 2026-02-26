import {
  IssueFunding,
  IssueFundingId,
  UserId,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "./Validator";
import { IssueIdCompanion } from "./github";

export namespace IssueFundingCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): IssueFunding | ValidationError {
    const githubIssueId = IssueIdCompanion.fromBackendForeignKey(
      row,
      table_prefix,
    );
    if (githubIssueId instanceof ValidationError) {
      return githubIssueId;
    }

    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const userId = validator.requiredString(`${table_prefix}user_id`);
    const amount = validator.requiredNumber(`${table_prefix}credit_amount`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as IssueFundingId,
      githubIssueId,
      userId: userId as UserId,
      credit: amount,
    } as IssueFunding;
  }
}
