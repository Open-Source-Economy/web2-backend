import { Request, Response } from "express";
import { planAndCreditsRepo, userRepo } from "../db/";
import {
  GetAvailableCreditsBody,
  GetAvailableCreditsParams,
  GetAvailableCreditsQuery,
  GetAvailableCreditsResponse,
  ResponseBody,
  SetUserPreferredCurrencyBody,
  SetUserPreferredCurrencyParams,
  SetUserPreferredCurrencyQuery,
  SetUserPreferredCurrencyResponse,
} from "../dtos";
import { StatusCodes } from "http-status-codes";
import { CompanyId, Currency, UserId } from "../model";
import { ApiError } from "../model/error/ApiError";

export class UserController {
  static async getAvailableCredit(
    req: Request<
      GetAvailableCreditsParams,
      ResponseBody<GetAvailableCreditsResponse>,
      GetAvailableCreditsBody,
      GetAvailableCreditsQuery
    >,
    res: Response<ResponseBody<GetAvailableCreditsResponse>>,
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
    const response: GetAvailableCreditsResponse = {
      creditAmount: creditAmount,
    };

    return res.status(StatusCodes.OK).send({ success: response });
  }

  static async setUserPreferredCurrency(
    req: Request<
      SetUserPreferredCurrencyParams,
      ResponseBody<SetUserPreferredCurrencyResponse>,
      SetUserPreferredCurrencyBody,
      SetUserPreferredCurrencyQuery
    >,
    res: Response<ResponseBody<SetUserPreferredCurrencyResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const userId: UserId = req.user.id;
    const currency: Currency = req.params.currency;

    await userRepo.setPreferredCurrency(userId, currency);

    const response: SetUserPreferredCurrencyResponse = {};

    return res.status(StatusCodes.OK).send({ success: response });
  }
}
