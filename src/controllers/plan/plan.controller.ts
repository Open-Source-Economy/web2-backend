import { Request, Response } from "express";
import * as dto from "../../api/dto";
import { StatusCodes } from "http-status-codes";
import {
  Currency,
  PlanPriceType,
  PlanProductType,
  StripePrice,
} from "../../api/model";
import { combinedStripeRepo } from "../../db";

export interface PlanController {
  getPlans(
    req: Request<
      dto.GetPlansParams,
      dto.ResponseBody<dto.GetPlansResponse>,
      dto.GetPlansBody,
      dto.GetPlansQuery
    >,
    res: Response<dto.ResponseBody<dto.GetPlansResponse>>,
  ): Promise<void>;
}

export const PlanController: PlanController = {
  async getPlans(
    req: Request<
      dto.GetPlansParams,
      dto.ResponseBody<dto.GetPlansResponse>,
      dto.GetPlansBody,
      dto.GetPlansQuery
    >,
    res: Response<dto.ResponseBody<dto.GetPlansResponse>>,
  ) {
    const prices: Record<
      PlanProductType,
      Record<Currency, Record<PlanPriceType, StripePrice>>
    > = await combinedStripeRepo.getPlanProductsWithPrices();

    const response: dto.GetPlansResponse = {
      plans: prices,
    };

    res.status(StatusCodes.OK).send({ success: response });
  },
};
