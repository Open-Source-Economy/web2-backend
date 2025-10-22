import {
  Owner,
  OwnerId,
  OwnerType,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

export namespace OwnerIdCompanion {
  export function fromBackendPrimaryKey(
    row: any,
    table_prefix: string = "",
  ): OwnerId | ValidationError {
    return fromAny(
      row,
      `${table_prefix}github_login`,
      `${table_prefix}github_id`,
    );
  }

  export function fromBackendForeignKey(
    row: any,
    table_prefix: string = "",
  ): OwnerId | ValidationError {
    return fromAny(
      row,
      `${table_prefix}github_owner_login`,
      `${table_prefix}github_owner_id`,
    );
  }

  function fromAny(
    data: any,
    loginKey: string,
    idKey: string,
  ): OwnerId | ValidationError {
    let json: any;
    if (typeof data === "object") {
      json = data;
    } else if (typeof data === "string") {
      json = JSON.parse(data);
    }

    const validator = new Validator(json);
    const login = validator.requiredString(loginKey);
    const id = validator.requiredNumber(idKey);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new OwnerId(login, id);
  }
}

export namespace OwnerCompanion {
  /**
   * Creates an `Owner` instance from a raw backend JSON object, typically retrieved from a SQL query.
   *
   * This method validates the required fields from the JSON and returns either a valid `Owner` instance
   * or a `ValidationError` if validation fails.
   *
   * @param json - The raw backend data object containing owner fields.
   * @param table_prefix - Optional prefix used to avoid column name conflicts when SQL joins are performed.
   *                       For example, if the `github_owner` table is joined with other tables in a query,
   *                       a prefix like `"owner_"` can be used so that columns become
   *                       `"owner_github_html_url"`, `"owner_github_avatar_url"`, etc.
   *                       This prefix is automatically prepended to relevant keys during validation.
   *
   * @returns A new `Owner` instance if validation succeeds, or a `ValidationError` otherwise.
   */
  export function fromBackend(
    json: any,
    table_prefix: string = "",
  ): Owner | ValidationError {
    const validator = new Validator(json);

    // @ts-ignore
    const type: OwnerType = validator.requiredEnum<OwnerType>(
      `${table_prefix}github_type`,
      Object.values(OwnerType) as OwnerType[],
    );
    const htmlUrl = validator.requiredString(`${table_prefix}github_html_url`);
    const avatarUrl = validator.requiredString(
      `${table_prefix}github_avatar_url`,
    );
    const followers = validator.optionalNumber(
      `${table_prefix}github_followers`,
    );
    const following = validator.optionalNumber(
      `${table_prefix}github_following`,
    );
    const publicRepos = validator.optionalNumber(
      `${table_prefix}github_public_repos`,
    );
    const publicGists = validator.optionalNumber(
      `${table_prefix}github_public_gists`,
    );
    const name = validator.optionalString(`${table_prefix}github_name`);
    const twitterUsername = validator.optionalString(
      `${table_prefix}github_twitter_username`,
    );
    const company = validator.optionalString(`${table_prefix}github_company`);
    const blog = validator.optionalString(`${table_prefix}github_blog`);
    const location = validator.optionalString(`${table_prefix}github_location`);
    const email = validator.optionalString(`${table_prefix}github_email`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    const ownerId = OwnerIdCompanion.fromBackendPrimaryKey(json, table_prefix);
    if (ownerId instanceof ValidationError) {
      return ownerId;
    }

    return new Owner(
      ownerId,
      type,
      htmlUrl,
      avatarUrl,
      followers,
      following,
      publicRepos,
      publicGists,
      name,
      twitterUsername,
      company,
      blog,
      location,
      email,
    );
  }
}
