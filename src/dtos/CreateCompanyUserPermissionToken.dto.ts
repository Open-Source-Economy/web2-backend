import { CompanyId, CompanyUserRole } from "../model";

export interface CreateCompanyUserPermissionTokenDto {
  userEmail: string;
  token: string;
  companyId: CompanyId;
  companyUserRole: CompanyUserRole;
  expiresAt: Date;
}