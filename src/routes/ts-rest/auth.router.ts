import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import {
  companyRepo,
  planAndCreditsRepo,
  companyUserPermissionTokenRepo,
  repositoryUserPermissionTokenRepo,
  userCompanyRepo,
  userRepo,
  userRepositoryRepo,
  passwordResetTokenRepo,
} from "../../db";
import { ApiError } from "../../errors";
import { secureToken } from "../../utils";
import { MailService } from "../../services/mail.service";
import * as dto from "@open-source-economy/api-types";

const mailService = new MailService();

/**
 * Helper to get auth info for a user (company, repositories, service tokens).
 */
async function getAuthInfo(user: dto.User): Promise<any> {
  let company: dto.Company | null = null;
  let companyRole: dto.CompanyUserRole | null = null;

  const companyRoles = await userCompanyRepo.getByUserId(user.id);
  if (companyRoles.length > 1) {
    throw ApiError.internal("User has multiple company roles");
  } else if (companyRoles.length === 1) {
    const [companyId, role] = companyRoles[0];
    company = await companyRepo.getById(companyId);
    companyRole = role;
  }

  const userRepos: dto.UserRepository[] = await userRepositoryRepo.getAll(user.id);
  const repositories = userRepos.map((ur: dto.UserRepository) => {
    const info: dto.RepositoryInfo = {
      role: ur.repositoryUserRole,
      rate: ur.rate ? ur.rate.toString() : null,
      currency: ur.currency,
    };
    return [ur.repositoryId, info];
  });

  const serviceTokens = await planAndCreditsRepo.getAvailableCredit(user.id, company?.id);

  return {
    authenticatedUser: {
      user: user,
      company: company,
      companyRole: companyRole,
      repositories: repositories,
      serviceTokens: serviceTokens,
    },
  };
}

/**
 * Partial auth router: only endpoints that DON'T need passport.authenticate().
 * Passport-dependent routes (register, login, github OAuth, logout) stay in Express.
 */
export const authRouter = s.router(contract.auth, {
  getStatus: async ({ req }) => {
    if (req.isAuthenticated() && req.user) {
      const response = await getAuthInfo(req.user as dto.User);
      return { status: 200 as const, body: response as any };
    }
    return {
      status: 200 as const,
      body: { authenticatedUser: null } as any,
    };
  },

  checkEmail: async ({ query }) => {
    const { email } = query;

    if (!email) {
      throw ApiError.badRequest("Email is required");
    }

    const user = await userRepo.findOne(email);

    if (!user) {
      return {
        status: 200 as const,
        body: { exists: false } as any,
      };
    }

    const provider = (user as any).provider ?? (user as any).data?.provider ?? undefined;
    return {
      status: 200 as const,
      body: { exists: true, provider } as any,
    };
  },

  forgotPassword: async ({ body }) => {
    const { email } = body;
    const user = await userRepo.findOne(email);

    if (user) {
      const [tokenString, expiresAt] = secureToken.generate({ email }, true);
      await passwordResetTokenRepo.create({
        userEmail: email,
        token: tokenString,
        expiresAt,
      });
      await mailService.sendPasswordResetEmail(email, tokenString, user.name);
    }

    // Always return OK to prevent email enumeration
    return { status: 201 as const, body: {} };
  },

  resetPassword: async ({ query, body }) => {
    const { token } = query;
    const { password } = body;

    const resetToken = await passwordResetTokenRepo.getByToken(token);

    if (!resetToken || resetToken.hasBeenUsed || resetToken.expiresAt < new Date()) {
      throw ApiError.badRequest("Invalid or expired token");
    }

    const user = await userRepo.findOne(resetToken.userEmail);
    if (!user) {
      throw ApiError.badRequest("User not found");
    }

    await userRepo.updatePassword(user.id, password);
    await passwordResetTokenRepo.use(token);

    return { status: 201 as const, body: {} };
  },

  getCompanyUserInviteInfo: async ({ query }) => {
    const companyUserPermissionToken = await companyUserPermissionTokenRepo.getByToken(query.token);

    return {
      status: 200 as const,
      body: {
        userName: companyUserPermissionToken?.userName,
        userEmail: companyUserPermissionToken?.userEmail,
      } as any,
    };
  },

  getRepositoryUserInviteInfo: async ({ query }) => {
    const repositoryUserPermissionToken = await repositoryUserPermissionTokenRepo.getByToken(query.token);

    return {
      status: 200 as const,
      body: {
        userName: repositoryUserPermissionToken?.userName,
        userGithubOwnerLogin: repositoryUserPermissionToken?.userGithubOwnerLogin,
        repositoryId: repositoryUserPermissionToken?.repositoryId,
      } as any,
    };
  },

  // These endpoints require passport.authenticate() middleware,
  // which is incompatible with ts-rest. They stay as Express routes
  // and these are placeholder implementations that throw.
  register: async () => {
    throw ApiError.internal("Register endpoint is handled by Express/Passport");
  },

  login: async () => {
    throw ApiError.internal("Login endpoint is handled by Express/Passport");
  },

  logout: async () => {
    throw ApiError.internal("Logout endpoint is handled by Express/Passport");
  },
});
