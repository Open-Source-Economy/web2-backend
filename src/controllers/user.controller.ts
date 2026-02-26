import { Request, Response } from "express";
import { planAndCreditsRepo, userRepo } from "../db/";
import * as dto from "@open-source-economy/api-types";
import { CompanyId, Currency, UserId } from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../errors";

export interface UserController {
  getAvailableCredit(
    req: Request<
      dto.GetAvailableCreditsParams,
      dto.GetAvailableCreditsResponse,
      {},
      dto.GetAvailableCreditsQuery
    >,
    res: Response<dto.GetAvailableCreditsResponse>,
  ): Promise<void>;

  getPlan(
    req: Request<
      dto.GetPlansParams,
      dto.GetUserPlanResponse,
      {},
      dto.GetUserPlanQuery
    >,
    res: Response<dto.GetUserPlanResponse>,
  ): Promise<void>;

  setUserPreferredCurrency(
    req: Request<
      dto.SetPreferredCurrencyParams,
      dto.SetPreferredCurrencyResponse,
      dto.SetPreferredCurrencyBody,
      dto.SetPreferredCurrencyQuery
    >,
    res: Response<dto.SetPreferredCurrencyResponse>,
  ): Promise<void>;
}

export const UserController: UserController = {
  async getAvailableCredit(
    req: Request<
      dto.GetAvailableCreditsParams,
      dto.GetAvailableCreditsResponse,
      {},
      dto.GetAvailableCreditsQuery
    >,
    res: Response<dto.GetAvailableCreditsResponse>,
  ) {
    if (!req.user) {
      throw ApiError.unauthorized("Unauthorized");
    }
    const userId: UserId = req.user.id;
    const companyId = req.query.companyId
      ? (req.query.companyId as CompanyId)
      : undefined;

    const creditAmount = await planAndCreditsRepo.getAvailableCredit(
      userId,
      companyId,
    );
    const response: dto.GetAvailableCreditsResponse = {
      creditAmount: creditAmount,
    };

    res.status(StatusCodes.OK).send(response);
  },

  async getPlan(
    req: Request<
      dto.GetPlansParams,
      dto.GetUserPlanResponse,
      {},
      dto.GetUserPlanQuery
    >,
    res: Response<dto.GetUserPlanResponse>,
  ) {
    if (!req.user) {
      throw ApiError.unauthorized("Unauthorized");
    }
    const userId: UserId = req.user.id;
    const companyId = req.query.companyId
      ? (req.query.companyId as CompanyId)
      : undefined;

    const types = await planAndCreditsRepo.getPlan(userId, companyId);
    const response: dto.GetUserPlanResponse = {
      productType: types ? types[0] : null,
      priceType: types ? types[1] : null,
    };

    res.status(StatusCodes.OK).send(response);
  },

  async setUserPreferredCurrency(
    req: Request<
      dto.SetPreferredCurrencyParams,
      dto.SetPreferredCurrencyResponse,
      dto.SetPreferredCurrencyBody,
      dto.SetPreferredCurrencyQuery
    >,
    res: Response<dto.SetPreferredCurrencyResponse>,
  ) {
    if (!req.user) {
      throw ApiError.unauthorized("Unauthorized");
    }
    const userId: UserId = req.user.id;
    const currency: Currency = req.params.currency;

    await userRepo.setPreferredCurrency(userId, currency);

    const response: dto.SetPreferredCurrencyResponse = {};

    res.status(StatusCodes.OK).send(response);
  },
};
