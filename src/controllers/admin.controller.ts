import { Request, Response } from "express";
import * as dto from "../api/dto";
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
import { OwnerId, Project } from "../api/model";
import { ApiError } from "../api/model/error/ApiError";
import { logger } from "../config";
import { CreateRepositoryUserPermissionTokenDto } from "../db/user/RepositoryUserPermissionToken.repository";
import { CampaignHelper } from "./campaign/campaign.helper";
import { PlanHelper } from "./plan/plan.helper";

const financialIssueRepo = getFinancialIssueRepository();

export class AdminController {
  static async createAddress(
    req: Request<
      dto.CreateAddressParams,
      dto.ResponseBody<dto.CreateAddressResponse>,
      dto.CreateAddressBody,
      dto.CreateAddressQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateAddressResponse>>,
  ) {
    const created = await addressRepo.create(req.body);

    const response: dto.CreateAddressResponse = {
      createdAddressId: created.id,
    };
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async createCompany(
    req: Request<
      dto.CreateCompanyParams,
      dto.ResponseBody<dto.CreateCompanyResponse>,
      dto.CreateCompanyBody,
      dto.CreateCompanyQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateCompanyResponse>>,
  ) {
    const created = await companyRepo.create(req.body);
    const response: dto.CreateCompanyResponse = {
      createdCompanyId: created.id,
    };
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async sendCompanyAdminInvite(
    req: Request<
      dto.SendCompanyRoleInviteParams,
      dto.ResponseBody<dto.SendCompanyRoleInviteResponse>,
      dto.SendCompanyRoleInviteBody,
      dto.SendCompanyRoleInviteQuery
    >,
    res: Response<dto.ResponseBody<dto.SendCompanyRoleInviteResponse>>,
  ) {
    const [token, expiresAt] = secureToken.generate({
      email: req.body.userEmail,
    });

    const createCompanyUserPermissionTokenBody: dto.CreateCompanyUserPermissionTokenBody =
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

    const response: dto.SendCompanyRoleInviteResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async sendRepositoryAdminInvite(
    req: Request<
      dto.SendRepositoryRoleInviteParams,
      dto.ResponseBody<dto.SendCompanyRoleInviteResponse>,
      dto.SendRepositoryRoleInviteBody,
      dto.SendRepositoryRoleInviteQuery
    >,
    res: Response<dto.ResponseBody<dto.SendCompanyRoleInviteResponse>>,
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

    const response: dto.SendRepositoryRoleInviteResponse = {};
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async createManualInvoice(
    req: Request<
      dto.CreateManualInvoiceParams,
      dto.ResponseBody<dto.CreateManualInvoiceResponse>,
      dto.CreateManualInvoiceBody,
      dto.CreateManualInvoiceQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateManualInvoiceResponse>>,
  ) {
    const created = await manualInvoiceRepo.create(req.body);
    const response: dto.CreateManualInvoiceResponse = {
      createdInvoiceId: created.id,
    };
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async createCampaignProductAndPrice(
    req: Request<
      dto.CreateCampaignProductAndPriceParams,
      dto.ResponseBody<dto.CreateCampaignProductAndPriceResponse>,
      dto.CreateCampaignProductAndPriceBody,
      dto.CreateCampaignProductAndPriceQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateCampaignProductAndPriceResponse>>,
  ) {
    const projectId = Project.getId(req.params.owner, req.params.repo);
    const project = await financialIssueRepo.getProject(projectId);

    await CampaignHelper.createProductsAndPrices(project);

    const response: dto.CreateCampaignProductAndPriceResponse = {};
    res.status(StatusCodes.CREATED).send({ success: response });
  }

  static async createPlanProductAndPrice(
    req: Request<
      dto.CreatePlanProductAndPriceParams,
      dto.ResponseBody<dto.CreatePlanProductAndPriceResponse>,
      dto.CreatePlanProductAndPriceBody,
      dto.CreatePlanProductAndPriceQuery
    >,
    res: Response<dto.ResponseBody<dto.CreatePlanProductAndPriceResponse>>,
  ) {
    await PlanHelper.createProductsAndPrices();

    const response: dto.CreatePlanProductAndPriceResponse = {};
    res.status(StatusCodes.CREATED).send({ success: response });
  }
}
