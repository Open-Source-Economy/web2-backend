import { Request, Response } from "express";
import {
  GetPlanPricesBody,
  GetPlanPricesParams,
  GetPlanPricesQuery,
  GetPlanPricesResponse,
  ResponseBody,
} from "../../api/dto";
import { StatusCodes } from "http-status-codes";
import {
  Currency,
  PlanPriceType,
  PlanProductType,
  StripePrice,
  StripeProduct,
} from "../../api/model";
import { combinedStripeRepo } from "../../db";

export class PlanController {
  static async getPlan(
    req: Request<
      GetPlanPricesParams,
      ResponseBody<GetPlanPricesResponse>,
      GetPlanPricesBody,
      GetPlanPricesQuery
    >,
    res: Response<ResponseBody<GetPlanPricesResponse>>,
  ) {
    const prices: Record<
      PlanProductType,
      [StripeProduct, Record<Currency, Record<PlanPriceType, StripePrice>>]
    > = await combinedStripeRepo.getPlanProductsWithPrices();

    const response: GetPlanPricesResponse = {
      prices,
    };

    return res.status(StatusCodes.OK).send({ success: response });
  }
}
