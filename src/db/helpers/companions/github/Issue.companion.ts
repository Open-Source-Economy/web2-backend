import {
  Issue,
  IssueId,
  ISODateTimeString,
  OwnerId,
  RepositoryId,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";
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

    return { repositoryId, number, githubId: id } as IssueId;
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

    const owner: OwnerId = { login: ownerLogin, githubId: ownerGithubId };
    const repositoryId: RepositoryId = {
      ownerId: owner,
      name: repositoryName,
      githubId: repositoryGithubId,
    };
    const issueId: IssueId = { repositoryId, number, githubId: id };
    const openByOwnerId: OwnerId = { login: openByLogin, githubId: openById };

    return {
      id: issueId,
      title,
      htmlUrl,
      createdAt: new Date(createdAt).toISOString() as ISODateTimeString,
      closedAt: closedAt
        ? (new Date(closedAt).toISOString() as ISODateTimeString)
        : null,
      openBy: openByOwnerId,
      body,
    } as Issue;
  }
}
