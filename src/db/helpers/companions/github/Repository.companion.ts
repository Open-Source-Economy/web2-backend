import {
  Repository,
  RepositoryId,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";
import { OwnerIdCompanion } from "./Owner.companion";

export namespace RepositoryIdCompanion {
  export function fromBackendPrimaryKey(
    row: any,
    table_prefix: string = "",
  ): RepositoryId | ValidationError {
    return fromAny(
      row,
      `${table_prefix}github_name`,
      `${table_prefix}github_id`,
      table_prefix,
    );
  }

  export function fromBackendForeignKey(
    row: any,
    table_prefix: string = "",
  ): RepositoryId | ValidationError {
    return fromAny(
      row,
      `${table_prefix}github_repository_name`,
      `${table_prefix}github_repository_id`,
      table_prefix,
    );
  }

  function fromAny(
    data: any,
    nameKey: string,
    idKey: string,
    table_prefix: string = "",
  ): RepositoryId | ValidationError {
    const ownerId = OwnerIdCompanion.fromBackendForeignKey(data, table_prefix);
    if (ownerId instanceof ValidationError) {
      return ownerId;
    }

    const validator = new Validator(data);
    const name = validator.requiredString(nameKey);
    const id = validator.requiredNumber(idKey);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new RepositoryId(ownerId, name, id);
  }
}

export namespace RepositoryCompanion {
  /**
   * Creates a `Repository` instance from a raw backend JSON object, typically retrieved from a SQL query.
   *
   * This method extracts and validates the required and optional fields from the JSON input and returns
   * a `Repository` instance if all validations succeed. If validation fails, a `ValidationError` is returned.
   *
   * @param json - The raw backend data object containing repository fields.
   * @param table_prefix - Optional prefix used to avoid column name conflicts when SQL joins are performed.
   *                       For example, if the `repository` table is joined with others in a query, a prefix
   *                       like `"repo_"` can be used so that columns become `"repo_github_html_url"`,
   *                       `"repo_github_description"`, etc. This prefix is automatically prepended to
   *                       relevant keys during validation.
   *
   * @returns A new `Repository` instance if validation succeeds, or a `ValidationError` otherwise.
   */
  export function fromBackend(
    json: any,
    table_prefix: string = "",
  ): Repository | ValidationError {
    const validator = new Validator(json);

    const repositoryId = RepositoryIdCompanion.fromBackendPrimaryKey(
      json,
      table_prefix,
    );
    if (repositoryId instanceof ValidationError) {
      return repositoryId;
    }

    const htmlUrl = validator.requiredString(`${table_prefix}github_html_url`);
    const description = validator.optionalString(
      `${table_prefix}github_description`,
    );
    const homepage = validator.optionalString(`${table_prefix}github_homepage`);
    const language = validator.optionalString(`${table_prefix}github_language`);
    const forksCount = validator.optionalNumber(
      `${table_prefix}github_forks_count`,
    );
    const stargazersCount = validator.optionalNumber(
      `${table_prefix}github_stargazers_count`,
    );
    const watchersCount = validator.optionalNumber(
      `${table_prefix}github_watchers_count`,
    );
    const fullName = validator.optionalString(
      `${table_prefix}github_full_name`,
    );
    const fork = validator.optionalBoolean(`${table_prefix}github_fork`);
    const topics = validator.optionalArray<string>(
      `${table_prefix}github_topics`,
      "string",
    );
    const openIssuesCount = validator.optionalNumber(
      `${table_prefix}github_open_issues_count`,
    );
    const visibility = validator.optionalString(
      `${table_prefix}github_visibility`,
    );
    const subscribersCount = validator.optionalNumber(
      `${table_prefix}github_subscribers_count`,
    );
    const networkCount = validator.optionalNumber(
      `${table_prefix}github_network_count`,
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new Repository(
      repositoryId,
      htmlUrl,
      description,
      homepage,
      language,
      forksCount,
      stargazersCount,
      watchersCount,
      fullName,
      fork,
      topics,
      openIssuesCount,
      visibility,
      subscribersCount,
      networkCount,
    );
  }
}
