import { Request, Response } from "express";
import { planAndCreditsRepo, userRepo } from "../db/";
import * as dto from "../dtos";
import { StatusCodes } from "http-status-codes";
import { CompanyId, Currency, UserId } from "../model";
import { ApiError } from "../model/error/ApiError";

export class UserController {
  static async getAvailableCredit(
    req: Request<
      dto.GetAvailableCreditsParams,
      dto.ResponseBody<dto.GetAvailableCreditsResponse>,
      dto.GetAvailableCreditsBody,
      dto.GetAvailableCreditsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetAvailableCreditsResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const userId: UserId = req.user.id;
    const companyId = req.query.companyId
      ? new CompanyId(req.query.companyId)
      : undefined;

    const creditAmount = await planAndCreditsRepo.getAvailableCredit(
      userId,
      companyId,
    );
    const response: dto.GetAvailableCreditsResponse = {
      creditAmount: creditAmount,
    };

    return res.status(StatusCodes.OK).send({ success: response });
  }

  static async getPlan(
    req: Request<
      dto.GetPlanParams,
      dto.ResponseBody<dto.GetPlanResponse>,
      dto.GetPlanBody,
      dto.GetPlanQuery
    >,
    res: Response<dto.ResponseBody<dto.GetPlanResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const userId: UserId = req.user.id;
    const companyId = req.query.companyId
      ? new CompanyId(req.query.companyId)
      : undefined;

    const productType = await planAndCreditsRepo.getPlan(userId, companyId);
    const response: dto.GetPlanResponse = {
      productType: productType,
    };

    return res.status(StatusCodes.OK).send({ success: response });
  }

  static async setUserPreferredCurrency(
    req: Request<
      dto.SetUserPreferredCurrencyParams,
      dto.ResponseBody<dto.SetUserPreferredCurrencyResponse>,
      dto.SetUserPreferredCurrencyBody,
      dto.SetUserPreferredCurrencyQuery
    >,
    res: Response<dto.ResponseBody<dto.SetUserPreferredCurrencyResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const userId: UserId = req.user.id;
    const currency: Currency = req.params.currency;

    await userRepo.setPreferredCurrency(userId, currency);

    const response: dto.SetUserPreferredCurrencyResponse = {};

    return res.status(StatusCodes.OK).send({ success: response });
  }
}
