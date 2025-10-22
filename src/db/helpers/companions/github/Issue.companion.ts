import {
  Issue,
  IssueId,
  OwnerId,
  RepositoryId,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { RepositoryIdCompanion } from "./Repository.companion";

export namespace IssueIdCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): IssueId | ValidationError {
    return fromAny(
      row,
      `${table_prefix}github_number`,
      `${table_prefix}github_id`,
      table_prefix,
    );
  }

  export function fromBackendForeignKey(
    row: any,
    table_prefix: string = "",
  ): IssueId | ValidationError {
    return fromAny(
      row,
      `${table_prefix}github_issue_number`,
      `${table_prefix}github_issue_id`,
      table_prefix,
    );
  }

  function fromAny(
    data: any,
    numberKey: string,
    idKey: string,
    table_prefix: string = "",
  ): IssueId | ValidationError {
    let json: any;
    if (typeof data === "object") {
      json = data;
    } else if (typeof data === "string") {
      json = JSON.parse(data);
    }

    const repositoryId = RepositoryIdCompanion.fromBackendForeignKey(
      json,
      table_prefix,
    );
    if (repositoryId instanceof ValidationError) {
      return repositoryId;
    }

    const validator = new Validator(json);
    const number = validator.requiredNumber(numberKey);
    const id = validator.requiredNumber(idKey);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new IssueId(repositoryId, number, id);
  }
}

export namespace IssueCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): Issue | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredNumber(`${table_prefix}github_id`);

    const ownerGithubId = validator.requiredNumber(
      `${table_prefix}github_owner_id`,
    );
    const ownerLogin = validator.requiredString(
      `${table_prefix}github_owner_login`,
    );

    const repositoryGithubId = validator.requiredNumber(
      `${table_prefix}github_repository_id`,
    );
    const repositoryName = validator.requiredString(
      `${table_prefix}github_repository_name`,
    );

    const number = validator.requiredNumber(`${table_prefix}github_number`);

    const title = validator.requiredString(`${table_prefix}github_title`);
    const htmlUrl = validator.requiredString(`${table_prefix}github_html_url`);
    const createdAt = validator.requiredString(
      `${table_prefix}github_created_at`,
    );
    const closedAt = validator.optionalString(
      `${table_prefix}github_closed_at`,
    );

    const openById = validator.requiredNumber(
      `${table_prefix}github_open_by_owner_id`,
    );
    const openByLogin = validator.requiredString(
      `${table_prefix}github_open_by_owner_login`,
    );

    const body = validator.optionalString(`${table_prefix}github_body`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    const owner = new OwnerId(ownerLogin, ownerGithubId);
    const repositoryId = new RepositoryId(
      owner,
      repositoryName,
      repositoryGithubId,
    );
    const issueId = new IssueId(repositoryId, number, id);
    const openByOwnerId = new OwnerId(openByLogin, openById);

    return new Issue(
      issueId,
      title,
      htmlUrl,
      new Date(createdAt),
      closedAt ? new Date(closedAt) : null,
      openByOwnerId,
      body,
    );
  }
}
