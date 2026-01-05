import { NextFunction, Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  ApiError,
  Company,
  CompanyUserPermissionToken,
  CompanyUserRole,
  Provider,
  RepositoryId,
  RepositoryUserPermissionToken,
  ThirdPartyUser,
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
  getUserRepository,
  repositoryUserPermissionTokenRepo,
  userCompanyRepo,
  userRepo,
  userRepositoryRepo,
} from "../db";
import { config, logger } from "../config";

export interface AuthController {
  status(
    req: Request<
      dto.StatusParams,
      dto.ResponseBody<dto.StatusResponse>,
      dto.StatusBody,
      dto.StatusQuery
    >,
    res: Response<dto.ResponseBody<dto.StatusResponse>>,
  ): Promise<void>;

  verifyCompanyToken(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
    next: NextFunction,
  ): Promise<void>;

  registerAsCompany(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ): Promise<void>;

  verifyRepositoryToken(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
    next: NextFunction,
  ): Promise<void>;

  registerForRepository(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ): Promise<void>;

  register(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ): Promise<void>;

  login(
    req: Request<
      dto.LoginParams,
      dto.ResponseBody<dto.LoginResponse>,
      dto.LoginBody,
      dto.LoginQuery
    >,
    res: Response<dto.ResponseBody<dto.LoginResponse>>,
  ): Promise<void>;

  logout(
    req: Request<
      dto.LogoutParams,
      dto.ResponseBody<dto.LogoutResponse>,
      dto.LogoutBody,
      dto.LogoutQuery
    >,
    res: Response<dto.ResponseBody<dto.LogoutResponse>>,
  ): Promise<void>;

  getCompanyUserInviteInfo(
    req: Request<
      dto.GetCompanyUserInviteInfoParams,
      dto.ResponseBody<dto.GetCompanyUserInviteInfoResponse>,
      dto.GetCompanyUserInviteInfoBody,
      dto.GetCompanyUserInviteInfoQuery
    >,
    res: Response<dto.ResponseBody<dto.GetCompanyUserInviteInfoResponse>>,
  ): Promise<void>;

  getRepositoryUserInviteInfo(
    req: Request<
      dto.GetRepositoryUserInviteInfoParams,
      dto.ResponseBody<dto.GetRepositoryUserInviteInfoResponse>,
      dto.GetRepositoryUserInviteInfoBody,
      dto.GetRepositoryUserInviteInfoQuery
    >,
    res: Response<dto.ResponseBody<dto.GetRepositoryUserInviteInfoResponse>>,
  ): Promise<void>;

  checkEmail(
    req: Request<
      dto.CheckEmailParams,
      dto.ResponseBody<dto.CheckEmailResponse>,
      dto.CheckEmailBody,
      dto.CheckEmailQuery
    >,
    res: Response<dto.ResponseBody<dto.CheckEmailResponse>>,
  ): Promise<void>;
}

// Helper functions
const AuthHelpers = {
  // TODO: probably put info of the company in the session, to to much avoid request to the DB.
  //       Now, it is not the best implementation, but it works for now
  async getCompanyRoles(
    userId: UserId,
  ): Promise<[Company | null, CompanyUserRole | null]> {
    let company: Company | null = null;
    let companyRole: CompanyUserRole | null = null;

    const companyRoles = await userCompanyRepo.getByUserId(userId);
    if (companyRoles.length > 1) {
      throw new ApiError(
        StatusCodes.NOT_IMPLEMENTED,
        "User has multiple company roles",
      );
    } else if (companyRoles.length === 1) {
      const [companyId, role] = companyRoles[0];
      company = await companyRepo.getById(companyId);
      companyRole = role;
    }

    return [company, companyRole];
  },

  async getRepositoryInfos(
    userId: UserId,
  ): Promise<[RepositoryId, dto.RepositoryInfo][]> {
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

  async getAuthInfo(user: User): Promise<dto.AuthInfo> {
    const [company, companyRole] = await AuthHelpers.getCompanyRoles(user.id);
    const repositories = await AuthHelpers.getRepositoryInfos(user.id);
    const serviceTokens = await planAndCreditsRepo.getAvailableCredit(
      user.id,
      company?.id,
    );

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
    req: Request<
      dto.StatusParams,
      dto.ResponseBody<dto.StatusResponse>,
      dto.StatusBody,
      dto.StatusQuery
    >,
    res: Response<dto.ResponseBody<dto.StatusResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.StatusResponse = await AuthHelpers.getAuthInfo(
        req.user as User,
      );
      res.status(StatusCodes.OK).send({ success: response }); // TODO: json instead of send ?
    } else {
      const response: dto.StatusResponse = {
        authenticatedUser: null,
      };
      res.status(StatusCodes.OK).send({ success: response });
    }
  },

  async verifyCompanyToken(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
    next: NextFunction,
  ) {
    const token = req.query.companyToken;

    if (token) {
      const companyUserPermissionToken =
        await companyUserPermissionTokenRepo.getByToken(token);
      const tokenData = await secureToken.verify(token);

      const error = new ApiError(
        StatusCodes.BAD_REQUEST,
        "Token expired or invalid",
      );
      if (companyUserPermissionToken === null) next(error);
      else if (companyUserPermissionToken.hasBeenUsed) next(error);
      else if (companyUserPermissionToken?.userEmail !== req.body.email)
        next(error);
      else if (companyUserPermissionToken?.userEmail !== tokenData.email) {
        next(
          new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Tokens are not matching",
          ),
        );
      } else if (companyUserPermissionToken.expiresAt < new Date()) next(error);
      else {
        // @ts-ignore
        req.companyUserPermissionToken = companyUserPermissionToken;
        next();
      }
    } else {
      next(new ApiError(StatusCodes.BAD_REQUEST, "No company token provided"));
    }
  },

  async registerAsCompany(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      // @ts-ignore
      const companyUserPermissionToken = req.companyUserPermissionToken!; // TODO: why "!" is needed here?
      await userRepo.validateEmail(req.body.email);

      await userCompanyRepo.insert(
        req.user.id,
        companyUserPermissionToken.companyId,
        companyUserPermissionToken.companyUserRole,
      );

      if (companyUserPermissionToken.token) {
        await companyUserPermissionTokenRepo.use(
          companyUserPermissionToken.token,
        );
      }
      const response: dto.StatusResponse = await AuthHelpers.getAuthInfo(
        req.user as User,
      );
      res.status(StatusCodes.CREATED).send({ success: response });
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  },

  async verifyRepositoryToken(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
    next: NextFunction,
  ) {
    const token = req.query.repositoryToken;
    if (token) {
      const repositoryUserPermissionToken =
        await repositoryUserPermissionTokenRepo.getByToken(token);
      const tokenData = await secureToken.verify(token);

      const error = new ApiError(
        StatusCodes.BAD_REQUEST,
        "Token expired or invalid",
      );
      if (repositoryUserPermissionToken === null) next(error);
      else if (repositoryUserPermissionToken.expiresAt < new Date())
        next(error);
      else {
        // @ts-ignore
        req.repositoryUserPermissionToken = repositoryUserPermissionToken;
        next();
      }
    } else {
      next(
        new ApiError(StatusCodes.BAD_REQUEST, "No repository token provided"),
      );
    }
  },

  async registerForRepository(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ) {
    const userData = req.user?.data!;
    const userId = req.user?.id!; // TODO: improve

    if (!(userData instanceof ThirdPartyUser)) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "User is not a third party user",
      );
    }

    // TODO: could be not only one
    const repositoryUserPermissionToken =
      await repositoryUserPermissionTokenRepo.getByUserGithubOwnerLogin(
        userData.providerData.owner.id.login,
      );

    if (repositoryUserPermissionToken) {
      const userRepository = new UserRepository(
        userId,
        repositoryUserPermissionToken.repositoryId,
        repositoryUserPermissionToken.repositoryUserRole,
        repositoryUserPermissionToken.rate,
        repositoryUserPermissionToken.currency,
      );

      await userRepositoryRepo.create(userRepository);

      if (repositoryUserPermissionToken.token) {
        await repositoryUserPermissionTokenRepo.use(
          repositoryUserPermissionToken.token,
        );
      }
    }
    res.redirect(
      ensureNoEndingTrailingSlash(config.frontEndUrl) + "/developer-onboarding",
    );
  },

  async register(
    req: Request<
      dto.RegisterParams,
      dto.ResponseBody<dto.RegisterResponse>,
      dto.RegisterBody,
      dto.RegisterQuery
    >,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.StatusResponse = await AuthHelpers.getAuthInfo(
        req.user as User,
      );
      res.status(StatusCodes.CREATED).send({ success: response });
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  },

  async login(
    req: Request<
      dto.LoginParams,
      dto.ResponseBody<dto.LoginResponse>,
      dto.LoginBody,
      dto.LoginQuery
    >,
    res: Response<dto.ResponseBody<dto.LoginResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.StatusResponse = await AuthHelpers.getAuthInfo(
        req.user as User,
      );
      res.status(StatusCodes.OK).send({ success: response }); // TODO: json instead of send ?
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  },

  async logout(
    req: Request<
      dto.LogoutParams,
      dto.ResponseBody<dto.LogoutResponse>,
      dto.LogoutBody,
      dto.LogoutQuery
    >,
    res: Response<dto.ResponseBody<dto.LogoutResponse>>,
  ) {
    if (!req.user) {
      res.status(StatusCodes.OK).send({ success: {} });
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
      res.status(StatusCodes.OK).send({ success: {} });
    });
  },

  async getCompanyUserInviteInfo(
    req: Request<
      dto.GetCompanyUserInviteInfoParams,
      dto.ResponseBody<dto.GetCompanyUserInviteInfoResponse>,
      dto.GetCompanyUserInviteInfoBody,
      dto.GetCompanyUserInviteInfoQuery
    >,
    res: Response<dto.ResponseBody<dto.GetCompanyUserInviteInfoResponse>>,
  ) {
    const query: dto.GetCompanyUserInviteInfoQuery = req.query;

    const companyUserPermissionToken: CompanyUserPermissionToken | null =
      await companyUserPermissionTokenRepo.getByToken(query.token);

    const response: dto.GetCompanyUserInviteInfoResponse = {
      userName: companyUserPermissionToken?.userName,
      userEmail: companyUserPermissionToken?.userEmail,
    };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getRepositoryUserInviteInfo(
    req: Request<
      dto.GetRepositoryUserInviteInfoParams,
      dto.ResponseBody<dto.GetRepositoryUserInviteInfoResponse>,
      dto.GetRepositoryUserInviteInfoBody,
      dto.GetRepositoryUserInviteInfoQuery
    >,
    res: Response<dto.ResponseBody<dto.GetRepositoryUserInviteInfoResponse>>,
  ) {
    const query: dto.GetRepositoryUserInviteInfoQuery = req.query;

    const repositoryUserPermissionToken: RepositoryUserPermissionToken | null =
      await repositoryUserPermissionTokenRepo.getByToken(query.token);

    const response: dto.GetRepositoryUserInviteInfoResponse = {
      userName: repositoryUserPermissionToken?.userName,
      userGithubOwnerLogin: repositoryUserPermissionToken?.userGithubOwnerLogin,
      repositoryId: repositoryUserPermissionToken?.repositoryId,
    };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async checkEmail(
    req: Request<
      dto.CheckEmailParams,
      dto.ResponseBody<dto.CheckEmailResponse>,
      dto.CheckEmailBody,
      dto.CheckEmailQuery
    >,
    res: Response<dto.ResponseBody<dto.CheckEmailResponse>>,
  ) {
    const query: dto.CheckEmailQuery = req.query;
    const { email } = query;

    if (!email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
    }

    logger.debug(`Checking status for email: ${email}`);

    const user = await userRepo.findOne(email);

    if (!user) {
      logger.debug(`No user found for email: ${email}`);
      const response: dto.CheckEmailResponse = {
        exists: false,
        // provider is undefined for non-existent users (locally registered)
      };
      res.status(StatusCodes.OK).send({ success: response });
      return;
    }

    logger.debug(`User found for email: ${email}`);
    // If provider is "github", set it; otherwise leave undefined (locally registered)
    const provider =
      user.data instanceof ThirdPartyUser ? user.data.provider : undefined;
    const response: dto.CheckEmailResponse = {
      exists: true,
      provider,
    };
    res.status(StatusCodes.OK).send({ success: response });
  },
};
