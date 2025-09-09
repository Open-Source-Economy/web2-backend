import {
  GithubData,
  Owner,
  Provider,
  ThirdPartyUser,
  ThirdPartyUserId,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

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

    const owner = Owner.fromGithubApi(json._json);
    if (owner instanceof ValidationError) {
      return owner;
    }

    const providerData: GithubData = { owner };

    return new ThirdPartyUser(
      provider,
      new ThirdPartyUserId(json.id),
      null,
      providerData,
    );
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
      const o = Owner.fromBackend(row);
      if (o instanceof ValidationError) {
        return o;
      }
      owner = o as Owner;
    }

    const providerData: GithubData = { owner };

    return new ThirdPartyUser(
      provider,
      new ThirdPartyUserId(thirdPartyId),
      email ?? null,
      providerData,
    );
  }
}
