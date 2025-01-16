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
  "Thanks a bunch! 🌟",
  "You're awesome! 🎉",
  "Wow, incredible! 🙌",
  "Amazing generosity! 🚀",
  "Absolutely fantastic! 🌈",
  "Legendary support! 🔥",
];

const CURRENCY_AMOUNTS: Record<Currency, number[]> = Object.values(
  Currency,
).reduce(
  (acc, currency) => {
    acc[currency] = [15, 30, 50, 100, 250, 500].map((amount) => amount * 100); // in cents
    return acc;
  },
  {} as Record<Currency, number[]>,
);

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
