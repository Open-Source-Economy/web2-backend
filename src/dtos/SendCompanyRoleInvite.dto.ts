import { CompanyId, CompanyUserRole } from "../model";

export interface SendCompanyRoleInviteParams {}

// TODO: should be renamed to SendCompanyRoleInviteBody
export interface SendCompanyRoleInviteBody {
  userName: string | null;
  userEmail: string;
  companyId: CompanyId;
  companyUserRole: CompanyUserRole;
}

export interface SendCompanyRoleInviteQuery {}

export interface SendCompanyRoleInviteResponse {}
