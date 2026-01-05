import { getUserCompanyRepository } from "./UserCompany.repository";
import { getCompanyUserPermissionTokenRepository } from "./CompanyUserPermissionToken.repository";
import { getRepositoryUserPermissionTokenRepository } from "./RepositoryUserPermissionToken.repository";
import { getUserRepositoryRepository } from "./UserRepository.repository";
import { getUserRepository } from "./User.repository";
import { getCompanyRepository } from "../Company.repository";
import { getPasswordResetTokenRepository } from "./user/PasswordResetToken.repository";

export const userRepo = getUserRepository();

export const companyRepo = getCompanyRepository();
export const userCompanyRepository = getUserCompanyRepository();
export const companyUserPermissionTokenRepo =
  getCompanyUserPermissionTokenRepository();
export const userCompanyRepo = getUserCompanyRepository();
export const repositoryUserPermissionTokenRepo =
  getRepositoryUserPermissionTokenRepository();
export const userRepositoryRepo = getUserRepositoryRepository();
