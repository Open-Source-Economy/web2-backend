import {
  GetPricesBody,
  GetPricesParams,
  GetPricesQuery,
  GetPricesResponse,
  ResponseBody,
} from "../../dtos";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Currency, PriceType, ProductType, Project } from "../../model";
import { getRoundedCreditAmount, StripeHelper } from "./stripe-helper";

const DONATION_LABELS = [
  "This made my day! 😄",
  "Thanks a bunch! 🌟",
  "You rock! 🎸",
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
    acc[currency] = [15, 30, 50, 100, 250, 500, 750, 1000].map(
      (amount) => amount * 100,
    ); // in cents
    return acc;
  },
  {} as Record<Currency, number[]>,
);

export const CURRENCY_PRICE_CONFIGS: Record<
  Currency,
  [number, Record<ProductType, Record<PriceType, string>>][]
> = Object.entries(CURRENCY_AMOUNTS).reduce(
  (acc, [currency, amounts]) => {
    if (amounts.length !== DONATION_LABELS.length) {
      throw new Error(
        `Currency ${currency} has ${amounts.length} amounts but there are ${DONATION_LABELS.length} labels`,
      );
    }

    acc[currency as Currency] = amounts.map((amount, index) => [
      amount,
      {
        [ProductType.donation]: {
          [PriceType.ONE_TIME]: DONATION_LABELS[index],
          [PriceType.RECURRING]: DONATION_LABELS[index],
        },
        [ProductType.credit]: {
          [PriceType.ONE_TIME]: `${getRoundedCreditAmount(amount, currency as Currency, PriceType.ONE_TIME)} credit`,
          [PriceType.RECURRING]: `${getRoundedCreditAmount(amount, currency as Currency, PriceType.RECURRING)} credit/mo`,
        },
      },
    ]);
    return acc;
  },
  {} as Record<
    Currency,
    [number, Record<ProductType, Record<PriceType, string>>][]
  >,
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
    const projectId = Project.getId(req.params.owner, req.params.repo);
    const prices = await StripeHelper.getPrices(
      projectId,
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
