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
} from "../model";
import { StatusCodes } from "http-status-codes";
import {
  GetCompanyUserInviteInfoQuery,
  GetCompanyUserInviteInfoResponse,
  LoginBody,
  LoginQuery,
  LoginResponse,
  RegisterBody,
  RegisterQuery,
  RegisterResponse,
  RepositoryInfo,
  ResponseBody,
  StatusBody,
  StatusQuery,
  StatusResponse,
} from "../dtos";
import { ensureNoEndingTrailingSlash, secureToken } from "../utils";
import {
  companyRepo,
  companyUserPermissionTokenRepo,
  repositoryUserPermissionTokenRepo,
  userCompanyRepo,
  userRepo,
  userRepositoryRepo,
} from "../db";
import { ApiError } from "../model/error/ApiError";
import {
  GetRepositoryUserInviteInfoQuery,
  GetRepositoryUserInviteInfoResponse,
} from "../dtos/auth/GetRepositoryUserInviteInfo.dto";
import { config, logger } from "../config";

export class AuthController {
  // TODO: probably put info of the company in the session, to to much avoid request to the DB.
  //       Now, it is not the best implementation, but it works for now
  private static async getCompanyRoles(
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
  }

  private static async getRepositoryInfos(
    userId: UserId,
  ): Promise<[RepositoryId, RepositoryInfo][]> {
    const userRepos: UserRepository[] = await userRepositoryRepo.getAll(userId);
    return userRepos.map((userRepo) => {
      const info: RepositoryInfo = {
        role: userRepo.repositoryUserRole,
        dowRate: userRepo.dowRate.toString(),
        dowCurrency: userRepo.dowCurrency,
      };
      return [userRepo.repositoryId, info];
    });
  }

  static async status(
    req: Request<{}, {}, StatusBody, StatusQuery>,
    res: Response<ResponseBody<StatusResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      const [company, companyRole] = await AuthController.getCompanyRoles(
        req.user.id,
      );
      const repositories = await AuthController.getRepositoryInfos(req.user.id);

      const response: StatusResponse = {
        user: req.user as User,
        company: company,
        companyRole: companyRole,
        repositories: repositories,
      };
      return res.status(StatusCodes.OK).send({ success: response }); // TODO: json instead of send ?
    } else {
      const response: StatusResponse = {
        user: null,
        company: null,
        companyRole: null,
        repositories: [],
      };
      return res.status(StatusCodes.OK).send({ success: response });
    }
  }

  static async verifyCompanyToken(
    req: Request<{}, {}, RegisterBody, RegisterQuery>,
    res: Response<ResponseBody<RegisterResponse>>,
    next: NextFunction,
  ) {
    const token = req.query.companyToken;

    if (token) {
      const companyUserPermissionToken =
        await companyUserPermissionTokenRepo.getByToken(token);
      const tokenData = await secureToken.verify(token);

      if (companyUserPermissionToken === null) {
        next(new ApiError(StatusCodes.BAD_REQUEST, "Token invalid"));
      } else if (companyUserPermissionToken?.userEmail !== req.body.email) {
        next(new ApiError(StatusCodes.BAD_REQUEST, "Token invalid"));
      } else if (companyUserPermissionToken?.userEmail !== tokenData.email) {
        next(
          new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Tokens are not matching",
          ),
        );
      } else if (companyUserPermissionToken.expiresAt < new Date()) {
        next(new ApiError(StatusCodes.BAD_REQUEST, "Token expired"));
      } else {
        // Pass the verified token if needed
        // @ts-ignore TODO: why is this not working?
        req.companyUserPermissionToken = companyUserPermissionToken;
        next();
      }
    } else {
      return next(
        new ApiError(StatusCodes.BAD_REQUEST, "No company token provided"),
      );
    }
  }

  static async registerAsCompany(
    req: Request<{}, {}, RegisterBody, RegisterQuery>,
    res: Response<ResponseBody<RegisterResponse>>,
  ) {
    // TODO: improve
    // @ts-ignore TODO: why is this not working?
    const companyUserPermissionToken = req.companyUserPermissionToken!;
    const userId = req.user?.id!; // TODO: improve

    await userRepo.validateEmail(req.body.email);

    await userCompanyRepo.insert(
      userId,
      companyUserPermissionToken.companyId,
      companyUserPermissionToken.companyUserRole,
    );

    if (companyUserPermissionToken.token) {
      await companyUserPermissionTokenRepo.delete(
        companyUserPermissionToken.token,
      );
    }

    res.sendStatus(StatusCodes.CREATED);
  }

  static async verifyRepositoryToken(
    req: Request<{}, {}, RegisterBody, RegisterQuery>,
    res: Response<ResponseBody<RegisterResponse>>,
    next: NextFunction,
  ) {
    const token = req.query.repositoryToken;
    if (token) {
      const repositoryUserPermissionToken =
        await repositoryUserPermissionTokenRepo.getByToken(token);
      const tokenData = await secureToken.verify(token);

      if (repositoryUserPermissionToken === null) {
        next(new ApiError(StatusCodes.BAD_REQUEST, "Token invalid"));
      } else if (repositoryUserPermissionToken.expiresAt < new Date()) {
        next(new ApiError(StatusCodes.BAD_REQUEST, "Token expired"));
      } else {
        // Pass the verified token if needed
        // @ts-ignore TODO: why is this not working?
        req.repositoryUserPermissionToken = repositoryUserPermissionToken;
        next();
      }
    } else {
      return next(
        new ApiError(StatusCodes.BAD_REQUEST, "No repository token provided"),
      );
    }
  }

  static async registerForRepository(
    req: Request<{}, {}, RegisterBody, RegisterQuery>,
    res: Response<ResponseBody<RegisterResponse>>,
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
        repositoryUserPermissionToken.dowRate,
        repositoryUserPermissionToken.dowCurrency,
      );

      await userRepositoryRepo.create(userRepository);

      if (repositoryUserPermissionToken.token) {
        await repositoryUserPermissionTokenRepo.delete(
          repositoryUserPermissionToken.token,
        );
      }
    }
    res.redirect(ensureNoEndingTrailingSlash(config.frontEndUrl));
  }

  static async register(
    req: Request<{}, {}, RegisterBody, RegisterQuery>,
    res: Response<ResponseBody<RegisterResponse>>,
  ) {
    const response: RegisterResponse = {
      user: req.user as User,
      company: null,
      companyRole: null,
      repositories: [],
    };
    return res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async login(
    req: Request<{}, {}, LoginBody, LoginQuery>,
    res: Response<ResponseBody<LoginResponse>>,
  ) {
    if (req.isAuthenticated() && req.user) {
      // TODO: refactor this: copy-paste in status
      const user = req.user as User;
      const [company, companyRole] = await AuthController.getCompanyRoles(
        req.user.id,
      );
      const repositories = await AuthController.getRepositoryInfos(req.user.id);

      const response: LoginResponse = {
        user: user,
        company,
        companyRole,
        repositories,
      };
      return res.status(StatusCodes.OK).send({ success: response });
    } else {
      return res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  }

  static async logout(req: Request, res: Response) {
    if (!req.user) return res.sendStatus(StatusCodes.OK);
    req.logout((err) => {
      if (err) return res.sendStatus(StatusCodes.BAD_REQUEST);
      res.sendStatus(StatusCodes.OK);
    });
  }

  static async getCompanyUserInviteInfo(
    req: Request<{}, {}, {}, GetCompanyUserInviteInfoQuery>,
    res: Response<ResponseBody<GetCompanyUserInviteInfoResponse>>,
  ) {
    const query: GetCompanyUserInviteInfoQuery = req.query;

    const companyUserPermissionToken: CompanyUserPermissionToken | null =
      await companyUserPermissionTokenRepo.getByToken(query.token);

    if (companyUserPermissionToken === null) {
      logger.info(`Token invalid or expired: ${query.token}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Token invalid or expired`);
    } else if (companyUserPermissionToken.expiresAt < new Date()) {
      logger.info(`Token invalid or expired: ${query.token}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Token invalid or expired`);
    } else {
      const response: GetCompanyUserInviteInfoResponse = {
        userName: companyUserPermissionToken.userName,
        userEmail: companyUserPermissionToken.userEmail,
      };
      return res.status(StatusCodes.OK).send({ success: response });
    }
  }

  static async getRepositoryUserInviteInfo(
    req: Request<{}, {}, {}, GetRepositoryUserInviteInfoQuery>,
    res: Response<ResponseBody<GetRepositoryUserInviteInfoResponse>>,
  ) {
    const query: GetRepositoryUserInviteInfoQuery = req.query;

    const repositoryUserPermissionToken: RepositoryUserPermissionToken | null =
      await repositoryUserPermissionTokenRepo.getByToken(query.token);

    if (repositoryUserPermissionToken === null) {
      logger.info(`Token invalid or expired: ${query.token}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Token invalid or expired`);
    } else if (repositoryUserPermissionToken.expiresAt < new Date()) {
      logger.info(`Token invalid or expired: ${query.token}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Token invalid or expired`);
    } else {
      const response: GetRepositoryUserInviteInfoResponse = {
        userName: repositoryUserPermissionToken.userName,
        userGithubOwnerLogin:
          repositoryUserPermissionToken.userGithubOwnerLogin,
        repositoryId: repositoryUserPermissionToken.repositoryId,
      };
      return res.status(StatusCodes.OK).send({ success: response });
    }
  }
}
