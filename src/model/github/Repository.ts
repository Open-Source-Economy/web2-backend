import { ValidationError, Validator } from "../utils";
import { OwnerId } from "./Owner";

export class RepositoryId {
  ownerId: OwnerId;
  name: string;
  githubId?: number;

  constructor(ownerId: OwnerId, name: string, githubId?: number) {
    this.ownerId = ownerId;
    this.name = name;
    this.githubId = githubId;
  }

  static fromGithubApi(json: any): RepositoryId | ValidationError {
    const validator = new Validator(json);
    const name = validator.requiredString("name");
    const id = validator.requiredNumber("id");

    const ownerId = OwnerId.fromGithubApi(json.owner);
    if (ownerId instanceof ValidationError) {
      return ownerId;
    }

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new RepositoryId(ownerId, name, id);
  }

  static fromBackend(json: any): RepositoryId | ValidationError {
    const validator = new Validator(json);
    const ownerGithubId = validator.requiredNumber("github_owner_id");
    const ownerGithubLogin = validator.requiredString("github_owner_login");

    const name = validator.requiredString("github_name");
    const githubId = validator.requiredNumber("github_id");

    const ownerId = new OwnerId(ownerGithubLogin, ownerGithubId);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new RepositoryId(ownerId, name, githubId);
  }
}

export class Repository {
  id: RepositoryId;
  htmlUrl: string;
  description?: string;

  constructor(id: RepositoryId, htmlUrl: string, description?: string) {
    this.id = id;
    this.htmlUrl = htmlUrl;
    this.description = description;
  }

  // Github API: https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository
  // Example:
  // Repo owned by an organization: https://api.github.com/repos/open-source-economy/frontend
  // Repo owned by a user: https://api.github.com/repos/laurianemollier/strongVerbes
  //
  // NOTE: Repo can be queried by owner id and repository id.
  // This does not work: https://api.github.com/repos/141809657/701996033
  // But that works: https://api.github.com/repositories/701996033
  // See discussion: https://github.com/octokit/octokit.rb/issues/483
  static fromGithubApi(json: any): Repository | ValidationError {
    const repositoryId = RepositoryId.fromGithubApi(json);
    if (repositoryId instanceof ValidationError) {
      return repositoryId;
    }

    const validator = new Validator(json);
    const htmlUrl = validator.requiredString("html_url");
    const description = validator.optionalString("description");
    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new Repository(repositoryId, htmlUrl, description);
  }

  static fromBackend(json: any): Repository | ValidationError {
    const repositoryId = RepositoryId.fromBackend(json);
    if (repositoryId instanceof ValidationError) {
      return repositoryId;
    }

    const validator = new Validator(json);
    const htmlUrl = validator.requiredString("github_html_url");
    const description = validator.optionalString("github_description");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new Repository(repositoryId, htmlUrl, description);
  }
}