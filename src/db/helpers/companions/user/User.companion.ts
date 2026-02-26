import {
  Currency,
  Owner,
  ThirdPartyUser,
  UserId,
  UserRole,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "../Validator";
import { LocalUserCompanion } from "./LocalUser.companion";
import { ThirdPartyUserCompanion } from "./ThirdPartyUser.companion";
import { BackendLocalUser, BackendUser } from "./backend-user.types";

export namespace UserCompanion {
  export function fromRaw(
    row: any,
    owner: Owner | null = null,
  ): BackendUser | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const name = validator.optionalString("name");
    const role = validator.requiredEnum(
      "role",
      Object.values(UserRole) as UserRole[],
    );
    const preferredCurrency = validator.optionalEnum(
      "preferred_currency",
      Object.values(Currency) as Currency[],
    );
    const termsAcceptedVersion = validator.optionalString(
      "terms_accepted_version",
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    let user: BackendLocalUser | ThirdPartyUser | ValidationError;

    if (row.hashed_password) {
      user = LocalUserCompanion.fromRaw(row);
    } else if (row.provider) {
      user = ThirdPartyUserCompanion.fromRaw(row, owner);
    } else {
      return new ValidationError("Unable to determine user type", row);
    }

    if (user instanceof ValidationError) {
      return user;
    }

    return {
      id: id as UserId,
      name: name ?? null,
      data: user,
      role,
      preferredCurrency,
      termsAcceptedVersion,
    } as BackendUser;
  }
}
