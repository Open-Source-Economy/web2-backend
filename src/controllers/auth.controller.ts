import { NextFunction, Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  Company,
  CompanyUserPermissionToken,
  CompanyUserRole,
  RepositoryId,
  RepositoryUserPermissionToken,
  User,
  UserId,
  UserRepository,
} from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { ensureNoEndingTrailingSlash, secureToken } from "../utils";
import {
  companyRepo,
  planAndCreditsRepo,
  companyUserPermissionTokenRepo,
  repositoryUserPermissionTokenRepo,
  userCompanyRepo,
  userRepo,
  userRepositoryRepo,
  passwordResetTokenRepo,
} from "../db";
import { config, logger } from "../config";
import { MailService } from "../services/mail.service";
import { ApiError } from "../errors";

const mailService = new MailService();

export interface AuthController {
  status(
    req: Request<dto.GetStatusParams, dto.GetStatusResponse, {}, dto.GetStatusQuery>,
    res: Response<dto.GetStatusResponse>
  ): Promise<void>;

  verifyCompanyToken(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>,
    next: NextFunction
  ): Promise<void>;

  registerAsCompany(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>
  ): Promise<void>;

  verifyRepositoryToken(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>,
    next: NextFunction
  ): Promise<void>;

  registerForRepository(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>
  ): Promise<void>;

  register(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>
  ): Promise<void>;

  login(
    req: Request<dto.LoginParams, dto.LoginResponse, dto.LoginBody, dto.LoginQuery>,
    res: Response<dto.LoginResponse>
  ): Promise<void>;

  logout(
    req: Request<dto.LogoutParams, dto.LogoutResponse, dto.LogoutBody, dto.LogoutQuery>,
    res: Response<dto.LogoutResponse>
  ): Promise<void>;

  getCompanyUserInviteInfo(
    req: Request<
      dto.GetCompanyUserInviteInfoParams,
      dto.GetCompanyUserInviteInfoResponse,
      {},
      dto.GetCompanyUserInviteInfoQuery
    >,
    res: Response<dto.GetCompanyUserInviteInfoResponse>
  ): Promise<void>;

  getRepositoryUserInviteInfo(
    req: Request<
      dto.GetRepositoryUserInviteInfoParams,
      dto.GetRepositoryUserInviteInfoResponse,
      {},
      dto.GetRepositoryUserInviteInfoQuery
    >,
    res: Response<dto.GetRepositoryUserInviteInfoResponse>
  ): Promise<void>;

  checkEmail(
    req: Request<dto.CheckEmailParams, dto.CheckEmailResponse, {}, dto.CheckEmailQuery>,
    res: Response<dto.CheckEmailResponse>
  ): Promise<void>;

  forgotPassword(
    req: Request<{}, dto.ForgotPasswordResponse, dto.ForgotPasswordBody, {}>,
    res: Response<dto.ForgotPasswordResponse>
  ): Promise<void>;

  resetPassword(
    req: Request<{}, dto.ResetPasswordResponse, dto.ResetPasswordBody, dto.ResetPasswordQuery>,
    res: Response<dto.ResetPasswordResponse>
  ): Promise<void>;
}

// Helper functions
const AuthHelpers = {
  // TODO: probably put info of the company in the session, to to much avoid request to the DB.
  //       Now, it is not the best implementation, but it works for now
  async getCompanyRoles(userId: UserId): Promise<[Company | null, CompanyUserRole | null]> {
    let company: Company | null = null;
    let companyRole: CompanyUserRole | null = null;

    const companyRoles = await userCompanyRepo.getByUserId(userId);
    if (companyRoles.length > 1) {
      throw ApiError.internal("User has multiple company roles");
    } else if (companyRoles.length === 1) {
      const [companyId, role] = companyRoles[0];
      company = await companyRepo.getById(companyId);
      companyRole = role;
    }

    return [company, companyRole];
  },

  async getRepositoryInfos(userId: UserId): Promise<[RepositoryId, dto.RepositoryInfo][]> {
    const userRepos: UserRepository[] = await userRepositoryRepo.getAll(userId);
    return userRepos.map((userRepo) => {
      const info: dto.RepositoryInfo = {
        role: userRepo.repositoryUserRole,
        rate: userRepo.rate ? userRepo.rate.toString() : null,
        currency: userRepo.currency,
      };
      return [userRepo.repositoryId, info];
    });
  },

  async getAuthInfo(user: User): Promise<dto.GetStatusResponse> {
    const [company, companyRole] = await AuthHelpers.getCompanyRoles(user.id);
    const repositories = await AuthHelpers.getRepositoryInfos(user.id);
    const serviceTokens = await planAndCreditsRepo.getAvailableCredit(user.id, company?.id);

    return {
      authenticatedUser: {
        user: user as User,
        company: company,
        companyRole: companyRole,
        repositories: repositories,
        serviceTokens: serviceTokens,
      },
    };
  },
};

export const AuthController: AuthController = {
  async status(
    req: Request<dto.GetStatusParams, dto.GetStatusResponse, {}, dto.GetStatusQuery>,
    res: Response<dto.GetStatusResponse>
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.GetStatusResponse = await AuthHelpers.getAuthInfo(req.user as User);
      res.status(StatusCodes.OK).send(response); // TODO: json instead of send ?
    } else {
      const response: dto.GetStatusResponse = {
        authenticatedUser: null,
      };
      res.status(StatusCodes.OK).send(response);
    }
  },

  async verifyCompanyToken(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>,
    next: NextFunction
  ) {
    const token = req.query.companyToken;

    if (token) {
      const companyUserPermissionToken = await companyUserPermissionTokenRepo.getByToken(token);
      const tokenData = await secureToken.verify(token);

      const error = ApiError.badRequest("Token expired or invalid");
      if (companyUserPermissionToken === null) next(error);
      else if (companyUserPermissionToken.hasBeenUsed) next(error);
      else if (companyUserPermissionToken?.userEmail !== req.body.email) next(error);
      else if (companyUserPermissionToken?.userEmail !== tokenData.email) {
        next(ApiError.internal("Tokens are not matching"));
      } else if (new Date(companyUserPermissionToken.expiresAt as string) < new Date()) next(error);
      else {
        // @ts-ignore
        req.companyUserPermissionToken = companyUserPermissionToken;
        next();
      }
    } else {
      next(ApiError.badRequest("No company token provided"));
    }
  },

  async registerAsCompany(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>
  ) {
    if (req.isAuthenticated() && req.user) {
      // @ts-ignore
      const companyUserPermissionToken = req.companyUserPermissionToken!; // TODO: why "!" is needed here?
      await userRepo.validateEmail(req.body.email);

      await userCompanyRepo.insert(
        req.user.id,
        companyUserPermissionToken.companyId,
        companyUserPermissionToken.companyUserRole
      );

      if (companyUserPermissionToken.token) {
        await companyUserPermissionTokenRepo.use(companyUserPermissionToken.token);
      }
      const response: dto.GetStatusResponse = await AuthHelpers.getAuthInfo(req.user as User);
      res.status(StatusCodes.CREATED).send(response);
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  },

  async verifyRepositoryToken(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>,
    next: NextFunction
  ) {
    const token = req.query.repositoryToken;
    if (token) {
      const repositoryUserPermissionToken = await repositoryUserPermissionTokenRepo.getByToken(token);
      const _tokenData = await secureToken.verify(token);

      const error = ApiError.badRequest("Token expired or invalid");
      if (repositoryUserPermissionToken === null) next(error);
      else if (new Date(repositoryUserPermissionToken.expiresAt as string) < new Date()) next(error);
      else {
        // @ts-ignore
        req.repositoryUserPermissionToken = repositoryUserPermissionToken;
        next();
      }
    } else {
      next(ApiError.badRequest("No repository token provided"));
    }
  },

  async registerForRepository(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>
  ) {
    // User no longer has .data property; access provider data differently
    const user = req.user as any;
    const userId = req.user?.id!; // TODO: improve

    // TODO: could be not only one
    const repositoryUserPermissionToken = await repositoryUserPermissionTokenRepo.getByUserGithubOwnerLogin(
      user?.providerData?.owner?.id?.login ?? user?.githubLogin
    );

    if (repositoryUserPermissionToken) {
      const userRepository: UserRepository = {
        userId,
        repositoryId: repositoryUserPermissionToken.repositoryId,
        repositoryUserRole: repositoryUserPermissionToken.repositoryUserRole,
        rate: repositoryUserPermissionToken.rate,
        currency: repositoryUserPermissionToken.currency,
      } as any;

      await userRepositoryRepo.create(userRepository);

      if (repositoryUserPermissionToken.token) {
        await repositoryUserPermissionTokenRepo.use(repositoryUserPermissionToken.token);
      }
    }
    res.redirect(ensureNoEndingTrailingSlash(config.frontEndUrl) + "/developer-onboarding");
  },

  async register(
    req: Request<dto.RegisterParams, dto.RegisterResponse, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.RegisterResponse>
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.GetStatusResponse = await AuthHelpers.getAuthInfo(req.user as User);
      res.status(StatusCodes.CREATED).send(response);
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  },

  async login(
    req: Request<dto.LoginParams, dto.LoginResponse, dto.LoginBody, dto.LoginQuery>,
    res: Response<dto.LoginResponse>
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.GetStatusResponse = await AuthHelpers.getAuthInfo(req.user as User);
      res.status(StatusCodes.OK).send(response); // TODO: json instead of send ?
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  },

  async logout(
    req: Request<dto.LogoutParams, dto.LogoutResponse, dto.LogoutBody, dto.LogoutQuery>,
    res: Response<dto.LogoutResponse>
  ) {
    if (!req.user) {
      res.status(StatusCodes.OK).send({});
      return;
    }
    req.logout((err) => {
      if (err) {
        res.status(StatusCodes.BAD_REQUEST).send({
          error: {
            code: StatusCodes.BAD_REQUEST,
            message: "Failed to logout user",
          },
        });
        return;
      }
      res.status(StatusCodes.OK).send({});
    });
  },

  async getCompanyUserInviteInfo(
    req: Request<
      dto.GetCompanyUserInviteInfoParams,
      dto.GetCompanyUserInviteInfoResponse,
      {},
      dto.GetCompanyUserInviteInfoQuery
    >,
    res: Response<dto.GetCompanyUserInviteInfoResponse>
  ) {
    const query: dto.GetCompanyUserInviteInfoQuery = req.query;

    const companyUserPermissionToken: CompanyUserPermissionToken | null =
      await companyUserPermissionTokenRepo.getByToken(query.token);

    const response: dto.GetCompanyUserInviteInfoResponse = {
      userName: companyUserPermissionToken?.userName,
      userEmail: companyUserPermissionToken?.userEmail,
    };
    res.status(StatusCodes.OK).send(response);
  },

  async getRepositoryUserInviteInfo(
    req: Request<
      dto.GetRepositoryUserInviteInfoParams,
      dto.GetRepositoryUserInviteInfoResponse,
      {},
      dto.GetRepositoryUserInviteInfoQuery
    >,
    res: Response<dto.GetRepositoryUserInviteInfoResponse>
  ) {
    const query: dto.GetRepositoryUserInviteInfoQuery = req.query;

    const repositoryUserPermissionToken: RepositoryUserPermissionToken | null =
      await repositoryUserPermissionTokenRepo.getByToken(query.token);

    const response: dto.GetRepositoryUserInviteInfoResponse = {
      userName: repositoryUserPermissionToken?.userName,
      userGithubOwnerLogin: repositoryUserPermissionToken?.userGithubOwnerLogin,
      repositoryId: repositoryUserPermissionToken?.repositoryId,
    };
    res.status(StatusCodes.OK).send(response);
  },

  async checkEmail(
    req: Request<dto.CheckEmailParams, dto.CheckEmailResponse, {}, dto.CheckEmailQuery>,
    res: Response<dto.CheckEmailResponse>
  ) {
    const query: dto.CheckEmailQuery = req.query;
    const { email } = query;

    if (!email) {
      throw ApiError.badRequest("Email is required");
    }

    logger.debug(`Checking status for email: ${email}`);

    const user = await userRepo.findOne(email);

    if (!user) {
      logger.debug(`No user found for email: ${email}`);
      const response: dto.CheckEmailResponse = {
        exists: false,
        // provider is undefined for non-existent users (locally registered)
      };
      res.status(StatusCodes.OK).send(response);
      return;
    }

    logger.debug(`User found for email: ${email}`);
    // provider info is no longer on user.data; access it via separate lookup if needed
    const provider = (user as any).provider ?? undefined;
    const response: dto.CheckEmailResponse = {
      exists: true,
      provider,
    };
    res.status(StatusCodes.OK).send(response);
  },

  async forgotPassword(
    req: Request<{}, dto.ForgotPasswordResponse, dto.ForgotPasswordBody, {}>,
    res: Response<dto.ForgotPasswordResponse>
  ) {
    const { email } = req.body;
    const user = await userRepo.findOne(email);

    if (user) {
      // Generate token
      const [tokenString, expiresAt] = secureToken.generate({ email }, true);

      await passwordResetTokenRepo.create({
        userEmail: email,
        token: tokenString,
        expiresAt,
      });

      await mailService.sendPasswordResetEmail(email, tokenString, user.name);
    }

    // Always return OK
    res.status(StatusCodes.OK).send({});
  },

  async resetPassword(
    req: Request<{}, dto.ResetPasswordResponse, dto.ResetPasswordBody, dto.ResetPasswordQuery>,
    res: Response<dto.ResetPasswordResponse>
  ) {
    const { token } = req.query;
    const { password } = req.body;

    const resetToken = await passwordResetTokenRepo.getByToken(token);

    // Validate token existence and expiry
    if (!resetToken || resetToken.hasBeenUsed || resetToken.expiresAt < new Date()) {
      throw ApiError.badRequest("Invalid or expired token");
    }

    // Update password
    const user = await userRepo.findOne(resetToken.userEmail);
    if (!user) {
      throw ApiError.badRequest("User not found");
    }

    await userRepo.updatePassword(user.id, password);
    await passwordResetTokenRepo.use(token);

    res.status(StatusCodes.OK).send({});
  },
};
