import {
  GithubData,
  Owner,
  Provider,
  ThirdPartyUser,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";
import { OwnerCompanion } from "../github";

export namespace ThirdPartyUserCompanion {
  export function fromJson(json: any): ThirdPartyUser | ValidationError {
    const validator = new Validator(json);
    const provider = validator.requiredEnum(
      "provider",
      Object.values(Provider) as Provider[],
    );
    const id = validator.requiredString("id");
    validator.optionalObject("_json");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    const owner = ownerFromGithubApi(json._json);
    if (owner instanceof ValidationError) {
      return owner;
    }

    const providerData: GithubData = { owner };

    return {
      provider,
      email: null,
      providerData,
    } as ThirdPartyUser;
  }

  export function fromRaw(
    row: any,
    owner: Owner | null = null,
  ): ThirdPartyUser | ValidationError {
    const validator = new Validator(row);
    const provider = validator.requiredEnum(
      "provider",
      Object.values(Provider) as Provider[],
    );
    const thirdPartyId = validator.requiredString("third_party_id");
    const email = validator.optionalString("email");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    if (owner === null) {
      const o = OwnerCompanion.fromBackend(row);
      if (o instanceof ValidationError) {
        return o;
      }
      owner = o as Owner;
    }

    const providerData: GithubData = { owner };

    return {
      provider,
      email: email ?? null,
      providerData,
    } as ThirdPartyUser;
  }
}

/**
 * Creates an Owner from GitHub API response JSON.
 * This replaces the removed Owner.fromGithubApi static method.
 */
function ownerFromGithubApi(json: any): Owner | ValidationError {
  if (!json) {
    return new ValidationError("Missing GitHub API JSON data");
  }

  const validator = new Validator(json);
  const login = validator.requiredString("login");
  const id = validator.requiredNumber("id");
  const type = validator.optionalString("type");
  const htmlUrl = validator.requiredString("html_url");
  const avatarUrl = validator.optionalString("avatar_url");
  const followers = validator.optionalNumber("followers");
  const following = validator.optionalNumber("following");
  const publicRepos = validator.optionalNumber("public_repos");
  const publicGists = validator.optionalNumber("public_gists");
  const name = validator.optionalString("name");
  const twitterUsername = validator.optionalString("twitter_username");
  const company = validator.optionalString("company");
  const blog = validator.optionalString("blog");
  const location = validator.optionalString("location");
  const email = validator.optionalString("email");

  const error = validator.getFirstError();
  if (error) {
    return error;
  }

  return {
    id: { login, githubId: id },
    type: (type || "User") as any,
    htmlUrl,
    avatarUrl,
    displayAvatarUrl: avatarUrl,
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
  } as Owner;
}

export { ownerFromGithubApi };
