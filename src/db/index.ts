import { getUserCompanyRepository } from "./UserCompany.repository";
import { getAddressRepository } from "./Address.repository";
import { getDowNumberRepository } from "./DowNumber.repository";
import { getFinancialIssueRepository } from "./FinancialIssue.repository";
import { getManagedIssueRepository } from "./ManagedIssue.repository";
import { getIssueFundingRepository } from "./IssueFunding.repository";
import { getUserRepository } from "./User.repository";
import { getCompanyRepository } from "./Company.repository";
import { getCompanyUserPermissionTokenRepository } from "./CompanyUserPermissionToken.repository";
import { getRepositoryUserPermissionTokenRepository } from "./RepositoryUserPermissionToken.repository";
import { getUserRepositoryRepository } from "./UserRepository.repository";
import { getManualInvoiceRepository } from "./ManualInvoice.repository";

export * from "./github/";
export * from "./stripe";
export * from "./User.repository";
export * from "./Company.repository";
export * from "./Address.repository";
export * from "./ManagedIssue.repository";
export * from "./IssueFunding.repository";
export * from "./ManualInvoice.repository";
export * from "./DowNumber.repository";
export * from "./UserCompany.repository";
export * from "./CompanyUserPermissionToken.repository";
export * from "./RepositoryUserPermissionToken.repository";
export * from "./UserRepository.repository";

export const userCompanyRepository = getUserCompanyRepository();
export const addressRepo = getAddressRepository();
export const dowNumberRepo = getDowNumberRepository();

export const financialIssueRepo = getFinancialIssueRepository();
export const managedIssueRepo = getManagedIssueRepository();
export const issueFundingRepo = getIssueFundingRepository();

export const userRepo = getUserRepository();

export const companyRepo = getCompanyRepository();
export const companyUserPermissionTokenRepo =
  getCompanyUserPermissionTokenRepository();
export const userCompanyRepo = getUserCompanyRepository();
export const repositoryUserPermissionTokenRepo =
  getRepositoryUserPermissionTokenRepository();
export const userRepositoryRepo = getUserRepositoryRepository();
export const manualInvoiceRepo = getManualInvoiceRepository();
