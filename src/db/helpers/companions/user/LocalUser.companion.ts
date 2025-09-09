import {
  LocalUser,
  ValidationError,
  Validator,
} from "@open-source-economy/api-types";

export namespace LocalUserCompanion {
  export function fromRaw(row: any): LocalUser | ValidationError {
    const validator = new Validator(row);
    const email = validator.requiredString("email");
    const isEmailVerified = validator.requiredBoolean("is_email_verified");
    const password = validator.requiredString("hashed_password");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new LocalUser(email, isEmailVerified, password);
  }
}
