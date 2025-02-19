import { Request, Response } from "express";
import {
  CreateAddressBody,
  CreateAddressQuery,
  CreateAddressResponse,
  CreateCompanyBody,
  CreateCompanyQuery,
  CreateCompanyResponse,
  CreateCompanyUserPermissionTokenBody,
  CreateManualInvoiceBody,
  CreateManualInvoiceQuery,
  CreateManualInvoiceResponse,
  ResponseBody,
  SendCompanyRoleInviteBody,
  SendCompanyRoleInviteParams,
  SendCompanyRoleInviteQuery,
  SendCompanyRoleInviteResponse,
  SendRepositoryRoleInviteBody,
  SendRepositoryRoleInviteQuery,
  SendRepositoryRoleInviteResponse,
} from "../dtos";
import { StatusCodes } from "http-status-codes";
import {
  addressRepo,
  companyRepo,
  companyUserPermissionTokenRepo,
  getFinancialIssueRepository,
  manualInvoiceRepo,
  repositoryUserPermissionTokenRepo,
} from "../db";
import { secureToken } from "../utils";
import { mailService } from "../services";
import Decimal from "decimal.js";
import { OwnerId, Project } from "../model";
import { ApiError } from "../model/error/ApiError";
import { logger } from "../config";
import {
  CreateProductAndPriceBody,
  CreateProductAndPriceParams,
  CreateProductAndPriceQuery,
  CreateProductAndPriceResponse,
} from "../dtos/stripe/CreateProductAndPrice";
import { CreateRepositoryUserPermissionTokenDto } from "../db/user/RepositoryUserPermissionToken.repository";
import { CampaignHelper } from "./campaign/campaign.helper";

const financialIssueRepo = getFinancialIssueRepository();

export class AdminController {
  static async createAddress(
    req: Request<{}, {}, CreateAddressBody, CreateAddressQuery>,
    res: Response<ResponseBody<CreateAddressResponse>>,
  ) {
    const created = await addressRepo.create(req.body);

    const response: CreateAddressResponse = {
      createdAddressId: created.id,
    };
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async createCompany(
    req: Request<{}, {}, CreateCompanyBody, CreateCompanyQuery>,
    res: Response<ResponseBody<CreateCompanyResponse>>,
  ) {
    const created = await companyRepo.create(req.body);
    const response: CreateCompanyResponse = {
      createdCompanyId: created.id,
    };
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async sendCompanyAdminInvite(
    req: Request<
      SendCompanyRoleInviteParams,
      ResponseBody<SendCompanyRoleInviteResponse>,
      SendCompanyRoleInviteBody,
      SendCompanyRoleInviteQuery
    >,
    res: Response<ResponseBody<SendCompanyRoleInviteResponse>>,
  ) {
    const [token, expiresAt] = secureToken.generate({
      email: req.body.userEmail,
    });

    const createCompanyUserPermissionTokenBody: CreateCompanyUserPermissionTokenBody =
      {
        userName: req.body.userName,
        userEmail: req.body.userEmail,
        token: token,
        companyId: req.body.companyId,
        companyUserRole: req.body.companyUserRole,
        expiresAt: expiresAt,
      };

    const company = await companyRepo.getById(req.body.companyId);

    if (!company) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Company ${req.body.companyId} not found`,
      );
    }

    const existing = await companyUserPermissionTokenRepo.getByUserEmail(
      req.body.userEmail,
      req.body.companyId,
    );

    for (const permission of existing) {
      if (permission.hasBeenUsed) {
        logger.error("Cannot send invite to user with used permission token");
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Cannot send invite to user with used permission token",
        );
      }
      logger.info(
        `Deleting existing company permission token ${permission.token}`,
      );
      await companyUserPermissionTokenRepo.delete(permission.token);
    }

    await companyUserPermissionTokenRepo.create(
      createCompanyUserPermissionTokenBody,
    );

    await mailService.sendCompanyAdminInvite(
      req.body.userName,
      req.body.userEmail,
      company,
      token,
    );

    const response: SendCompanyRoleInviteResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async sendRepositoryAdminInvite(
    req: Request<
      {},
      {},
      SendRepositoryRoleInviteBody,
      SendRepositoryRoleInviteQuery
    >,
    res: Response<ResponseBody<SendCompanyRoleInviteResponse>>,
  ) {
    const [token, expiresAt] = secureToken.generate({
      email: req.body.userEmail,
    });

    const user = await financialIssueRepo.getOwner(
      new OwnerId(req.body.userGithubOwnerLogin),
    );
    const [owner, repository] = await financialIssueRepo.getRepository(
      req.body.repositoryId,
    );

    const createRepositoryUserPermissionTokenDto: CreateRepositoryUserPermissionTokenDto =
      {
        userName: req.body.userName,
        userEmail: req.body.userEmail ?? null,
        userGithubOwnerLogin: req.body.userGithubOwnerLogin,
        token: token,
        repositoryId: repository.id,
        repositoryUserRole: req.body.repositoryUserRole,
        rate: req.body.rate ? new Decimal(req.body.rate) : null,
        currency: req.body.currency ? req.body.currency : null,
        expiresAt: expiresAt,
      };

    const existing =
      await repositoryUserPermissionTokenRepo.getByUserGithubOwnerLogin(
        req.body.userGithubOwnerLogin,
      );

    if (existing) {
      if (existing.hasBeenUsed) {
        logger.error("Cannot send invite to user with used permission token");
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Cannot send invite to user with used permission token",
        );
      }
      logger.info(
        `Deleting existing repository permission token ${existing.token}`,
      );
      await repositoryUserPermissionTokenRepo.delete(existing.token);
    }

    await repositoryUserPermissionTokenRepo.create(
      createRepositoryUserPermissionTokenDto,
    );

    if (req.body.userEmail && req.body.sendEmail) {
      await mailService.sendRepositoryAdminInvite(
        req.body.userName,
        req.body.userEmail,
        user,
        owner,
        repository,
        token,
      );
    }

    const response: SendRepositoryRoleInviteResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async createManualInvoice(
    req: Request<{}, {}, CreateManualInvoiceBody, CreateManualInvoiceQuery>,
    res: Response<ResponseBody<CreateManualInvoiceResponse>>,
  ) {
    const created = await manualInvoiceRepo.create(req.body);
    const response: CreateManualInvoiceResponse = {
      createdInvoiceId: created.id,
    };
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  // TODO: lolo
  static async createProductAndPrice(
    req: Request<
      CreateProductAndPriceParams,
      ResponseBody<CreateProductAndPriceResponse>,
      CreateProductAndPriceBody,
      CreateProductAndPriceQuery
    >,
    res: Response<ResponseBody<CreateProductAndPriceResponse>>,
  ) {
    const projectId = Project.getId(req.params.owner, req.params.repo);
    const project = await financialIssueRepo.getProject(projectId);

    await CampaignHelper.createCampaignProductAndPrice(project);

    const response: CreateProductAndPriceResponse = {};
    res.status(StatusCodes.CREATED).send({ success: response });
  }
}
