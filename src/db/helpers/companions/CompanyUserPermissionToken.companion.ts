import {
  CompanyId,
  CompanyUserPermissionToken,
  CompanyUserPermissionTokenId,
  CompanyUserRole,
  ISODateTimeString,
} from "@open-source-economy/api-types";
import { ValidationError, Validator } from "./Validator";

export namespace CompanyUserPermissionTokenCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): CompanyUserPermissionToken | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const userName = validator.optionalString(`${table_prefix}user_name`);
    const userEmail = validator.requiredString(`${table_prefix}user_email`);
    const token = validator.requiredString(`${table_prefix}token`);
    const companyId = validator.requiredString(`${table_prefix}company_id`);
    const companyUserRole = validator.requiredEnum(
      `${table_prefix}company_user_role`,
      Object.values(CompanyUserRole) as CompanyUserRole[],
    );
    const expiresAt = validator.requiredDate(`${table_prefix}expires_at`);
    const hasBeenUsed = validator.requiredBoolean(
      `${table_prefix}has_been_used`,
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as CompanyUserPermissionTokenId,
      userName: userName ?? null,
      userEmail,
      token,
      companyId: companyId as CompanyId,
      companyUserRole,
      expiresAt: expiresAt as ISODateTimeString,
      hasBeenUsed,
    } as CompanyUserPermissionToken;
  }
}
