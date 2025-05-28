import { NextFunction, Request, Response } from "express";
import {
  Company,
  CompanyUserPermissionToken,
  CompanyUserRole,
  RepositoryId,
  RepositoryUserPermissionToken,
  ThirdPartyUser,
  User,
  UserId,
  UserRepository,
} from "../api/model";
import { StatusCodes } from "http-status-codes";
import * as dto from "../api/dto";
import { ensureNoEndingTrailingSlash, secureToken } from "../utils";
import {
  companyRepo,
  companyUserPermissionTokenRepo,
  repositoryUserPermissionTokenRepo,
  userCompanyRepo,
  userRepo,
  userRepositoryRepo,
} from "../db";
import { ApiError } from "../api/model/error/ApiError";
import { config } from "../config";

export interface AuthController {
  status(
    req: Request<{}, {}, dto.StatusBody, dto.StatusQuery>,
    res: Response<dto.ResponseBody<dto.StatusResponse>>,
  ): Promise<void>;

  verifyCompanyToken(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
    next: NextFunction,
  ): Promise<void>;

  registerAsCompany(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ): Promise<void>;

  verifyRepositoryToken(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
    next: NextFunction,
  ): Promise<void>;

  registerForRepository(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ): Promise<void>;

  register(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
    res: Response<dto.ResponseBody<dto.RegisterResponse>>,
  ): Promise<void>;

  login(
    req: Request<{}, {}, dto.LoginBody, dto.LoginQuery>,
    res: Response<dto.ResponseBody<dto.LoginResponse>>,
  ): Promise<void>;

  logout(req: Request, res: Response): Promise<void>;

  getCompanyUserInviteInfo(
    req: Request<{}, {}, {}, dto.GetCompanyUserInviteInfoQuery>,
    res: Response<dto.ResponseBody<dto.GetCompanyUserInviteInfoResponse>>,
  ): Promise<void>;

  getRepositoryUserInviteInfo(
    req: Request<{}, {}, {}, dto.GetRepositoryUserInviteInfoQuery>,
    res: Response<dto.ResponseBody<dto.GetRepositoryUserInviteInfoResponse>>,
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

    return {
      user: user as User,
      company: company,
      companyRole: companyRole,
      repositories: repositories,
    };
  },
};

export const AuthController: AuthController = {
  async status(
    req: Request<{}, {}, dto.StatusBody, dto.StatusQuery>,
    res: Response<dto.ResponseBody<dto.StatusResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      const response: dto.StatusResponse = await AuthHelpers.getAuthInfo(
        req.user as User,
      );
      res.status(StatusCodes.OK).send({ success: response }); // TODO: json instead of send ?
    } else {
      const response: dto.StatusResponse = {
        user: null,
        company: null,
        companyRole: null,
        repositories: [],
      };
      res.status(StatusCodes.OK).send({ success: response });
    }
  },

  async verifyCompanyToken(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
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
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
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
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
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
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
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
    res.redirect(ensureNoEndingTrailingSlash(config.frontEndUrl));
  },

  async register(
    req: Request<{}, {}, dto.RegisterBody, dto.RegisterQuery>,
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
    req: Request<{}, {}, dto.LoginBody, dto.LoginQuery>,
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

  async logout(req: Request, res: Response) {
    if (!req.user) {
      res.sendStatus(StatusCodes.OK);
      return;
    }
    req.logout((err) => {
      if (err) {
        res.sendStatus(StatusCodes.BAD_REQUEST);
        return;
      }
      res.sendStatus(StatusCodes.OK);
    });
  },

  async getCompanyUserInviteInfo(
    req: Request<{}, {}, {}, dto.GetCompanyUserInviteInfoQuery>,
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
    req: Request<{}, {}, {}, dto.GetRepositoryUserInviteInfoQuery>,
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
};
