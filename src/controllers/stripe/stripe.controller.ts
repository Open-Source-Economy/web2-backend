import {
  GetPricesBody,
  GetPricesParams,
  GetPricesQuery,
  GetPricesResponse,
  ResponseBody,
} from "../../dtos";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Currency, OwnerId, RepositoryId } from "../../model";
import { StripeHelper } from "./stripe-helper";

const LABELS = [
  "15 mDOW",
  "30 mDOW",
  "50 mDOW",
  "100 mDOW",
  "200 mDOW",
  "500 mDOW",
  "1000 mDOW",
  "2000 mDOW",
  "5000 mDOW",
  "10000 mDOW",
];

const CURRENCY_AMOUNTS: Record<Currency, number[]> = {
  [Currency.USD]: [15, 30, 50, 100, 200, 500, 1000, 2000, 5000, 10000].map(
    (amount) => amount * 100,
  ), // in cents
  [Currency.EUR]: [13, 27, 45, 90, 180, 450, 900, 1800, 4500, 9000].map(
    (amount) => amount * 100,
  ), // in cents
  [Currency.GBP]: [12, 24, 40, 80, 160, 400, 800, 1600, 4000, 8000].map(
    (amount) => amount * 100,
  ), // in cents
  [Currency.CHF]: [14, 28, 46, 92, 184, 460, 920, 184, 4600, 9200].map(
    (amount) => amount * 100,
  ), // in cents
};

export const CURRENCY_PRICE_CONFIGS: Record<Currency, [number, string][]> =
  Object.entries(CURRENCY_AMOUNTS).reduce(
    (acc, [currency, amounts]) => {
      if (amounts.length !== LABELS.length) {
        throw new Error(
          `Currency ${currency} has ${amounts.length} amounts but there are ${LABELS.length} labels`,
        );
      }

      acc[currency as Currency] = amounts.map((amount, index) => [
        amount,
        LABELS[index],
      ]);
      return acc;
    },
    {} as Record<Currency, [number, string][]>,
  );

export class StripeController {
  static async getPrices(
    req: Request<
      GetPricesParams,
      ResponseBody<GetPricesResponse>,
      GetPricesBody,
      GetPricesQuery
    >,
    res: Response<ResponseBody<GetPricesResponse>>,
  ) {
    const { owner, repo } = req.params;
    const repositoryId = new RepositoryId(new OwnerId(owner), repo);
    const prices = await StripeHelper.getPrices(
      repositoryId,
      CURRENCY_PRICE_CONFIGS,
    );

    const response: GetPricesResponse = {
      prices,
    };
    res.status(StatusCodes.OK).send({
      success: response,
    });
  }
}
