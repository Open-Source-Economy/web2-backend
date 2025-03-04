import { Request, Response } from "express";
import {
  GetPlansBody,
  GetPlansParams,
  GetPlansQuery,
  GetPlansResponse,
  ResponseBody,
} from "../../api/dto";
import { StatusCodes } from "http-status-codes";
import {
  Currency,
  PlanPriceType,
  PlanProductType,
  StripePrice,
} from "../../api/model";
import { combinedStripeRepo } from "../../db";

export class PlanController {
  static async getPlans(
    req: Request<
      GetPlansParams,
      ResponseBody<GetPlansResponse>,
      GetPlansBody,
      GetPlansQuery
    >,
    res: Response<ResponseBody<GetPlansResponse>>,
  ) {
    const prices: Record<
      PlanProductType,
      Record<Currency, Record<PlanPriceType, StripePrice>>
    > = await combinedStripeRepo.getPlanProductsWithPrices();

    const response: GetPlansResponse = {
      plans: prices,
    };

    return res.status(StatusCodes.OK).send({ success: response });
  }
}
