import { ValidationError, Validator } from "./utils";
import { CompanyId } from "./index";

export enum CompanyUserRole {
  ADMIN = "admin",
  SUGGEST = "suggest",
  READ = "read",
}

export class CompanyUserPermissionTokenId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }

  toString(): string {
    return this.uuid;
  }
}

export class CompanyUserPermissionToken {
  id: CompanyUserPermissionTokenId;
  userEmail: string;
  token: string;
  companyId: CompanyId;
  companyUserRole: CompanyUserRole;
  expiresAt: Date;

  constructor(
    id: CompanyUserPermissionTokenId,
    userEmail: string,
    token: string,
    companyId: CompanyId,
    companyUserRole: CompanyUserRole,
    expiresAt: Date,
  ) {
    this.id = id;
    this.userEmail = userEmail;
    this.token = token;
    this.companyId = companyId;
    this.companyUserRole = companyUserRole;
    this.expiresAt = expiresAt;
  }

  static fromBackend(row: any): CompanyUserPermissionToken | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const userEmail = validator.requiredString("user_email");
    const token = validator.requiredString("token");
    const companyId = validator.requiredString("company_id");
    const companyUserRole = validator.requiredEnum(
      "company_user_role",
      Object.values(CompanyUserRole) as CompanyUserRole[],
    );
    const expiresAt = validator.requiredDate("expires_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new CompanyUserPermissionToken(
      new CompanyUserPermissionTokenId(id),
      userEmail,
      token,
      new CompanyId(companyId),
      companyUserRole,
      expiresAt,
    );
  }
}