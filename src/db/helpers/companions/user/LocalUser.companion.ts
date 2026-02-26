import { ValidationError, Validator } from "../Validator";
import { BackendLocalUser } from "./backend-user.types";

export namespace LocalUserCompanion {
  export function fromRaw(row: any): BackendLocalUser | ValidationError {
    const validator = new Validator(row);
    const email = validator.requiredString("email");
    const isEmailVerified = validator.requiredBoolean("is_email_verified");
    const password = validator.requiredString("hashed_password");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return { email, isEmailVerified, password } as BackendLocalUser;
  }
}
