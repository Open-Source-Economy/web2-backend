import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  Currency,
  PlanPriceType,
  PlanProductType,
  StripePrice,
} from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { combinedStripeRepo } from "../../db";

export interface PlanController {
  getPlans(
    req: Request<
      dto.GetPlansParams,
      dto.GetPlansResponse,
      {},
      dto.GetPlansQuery
    >,
    res: Response<dto.GetPlansResponse>,
  ): Promise<void>;
}

export const PlanController: PlanController = {
  async getPlans(
    req: Request<
      dto.GetPlansParams,
      dto.GetPlansResponse,
      {},
      dto.GetPlansQuery
    >,
    res: Response<dto.GetPlansResponse>,
  ) {
    const prices: Record<
      PlanProductType,
      Record<Currency, Record<PlanPriceType, StripePrice>>
    > = await combinedStripeRepo.getPlanProductsWithPrices();

    const response: dto.GetPlansResponse = {
      plans: prices,
    };

    res.status(StatusCodes.OK).send(response);
  },
};
