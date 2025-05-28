import { Request, Response } from "express";
import * as dto from "../../api/dto";
import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  OwnerId,
  ProjectUtils,
  RepositoryId,
} from "../../api/model";
import { StatusCodes } from "http-status-codes";
import { stripeMiscellaneousRepository } from "../../db";
import { currencyAPI } from "../../services";
import { logger } from "../../config";
import { CampaignHelper, getRoundedCreditAmount } from "./campaign.helper";

export type CampaignProductPriceConfig = Record<
  Currency,
  [number, Record<CampaignProductType, Record<CampaignPriceType, string>>][]
>;

const CAMPAIGN_DONATION_LABELS = [
  "This made my day! 😄",
  "Thanks a bunch! 🌟",
  "You rock! 🎸",
  "You're awesome! 🎉",
  "Wow, incredible! 🙌",
  "Amazing generosity! 🚀",
  "Absolutely fantastic! 🌈",
  "Legendary support! 🔥",
];

const CAMPAIGN_CURRENCY_AMOUNTS: Record<Currency, number[]> = Object.values(
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

export const CAMPAIGN_PRICE_CONFIGS: CampaignProductPriceConfig =
  Object.entries(CAMPAIGN_CURRENCY_AMOUNTS).reduce(
    (acc, [currency, amounts]) => {
      if (amounts.length !== CAMPAIGN_DONATION_LABELS.length) {
        throw new Error(
          `Currency ${currency} has ${amounts.length} amounts but there are ${CAMPAIGN_DONATION_LABELS.length} labels`,
        );
      }

      acc[currency as Currency] = amounts.map((amount, index) => [
        amount,
        {
          [CampaignProductType.DONATION]: {
            [CampaignPriceType.ONE_TIME]: CAMPAIGN_DONATION_LABELS[index],
            [CampaignPriceType.MONTHLY]: CAMPAIGN_DONATION_LABELS[index],
          },
          [CampaignProductType.CREDIT]: {
            [CampaignPriceType.ONE_TIME]: `${getRoundedCreditAmount(amount, currency as Currency, CampaignPriceType.ONE_TIME)} credit`,
            [CampaignPriceType.MONTHLY]: `${getRoundedCreditAmount(amount, currency as Currency, CampaignPriceType.MONTHLY)} credit/mo`,
          },
        },
      ]);
      return acc;
    },
    {} as CampaignProductPriceConfig,
  );

export interface CampaignController {
  getCampaign(
    req: Request<
      dto.GetCampaignParams,
      dto.ResponseBody<dto.GetCampaignResponse>,
      dto.GetCampaignBody,
      dto.GetCampaignQuery
    >,
    res: Response<dto.ResponseBody<dto.GetCampaignResponse>>,
  ): Promise<void>;
}

// Helper functions
const CampaignHelpers = {
  async calculateRaisedAmounts(
    projectId: RepositoryId | OwnerId,
  ): Promise<Record<Currency, number>> {
    const raisedAmountPerCurrency =
      await stripeMiscellaneousRepository.getRaisedAmountPerCurrency(projectId);

    const raisedAmount: Record<Currency, number> = Object.values(
      Currency,
    ).reduce(
      (acc, currency) => {
        acc[currency] = 0;
        return acc;
      },
      {} as Record<Currency, number>,
    );

    // For each target currency
    Object.values(Currency).forEach((targetCurrency) => {
      // Sum up converted amounts from all source currencies
      Object.entries(raisedAmountPerCurrency).forEach(
        ([sourceCurrency, amount]) => {
          raisedAmount[targetCurrency] += currencyAPI.convertPrice(
            amount,
            sourceCurrency as Currency,
            targetCurrency as Currency,
          );
        },
      );
    });

    logger.debug(`Raised amount per currency`, raisedAmountPerCurrency);
    logger.debug(`Raised amount`, raisedAmount);

    return raisedAmount;
  },

  getTargetAmount(projectId: RepositoryId | OwnerId): number {
    let targetAmount$: number = 2_000 * 100; // default target amount

    if (projectId instanceof RepositoryId) {
      if (projectId.ownerId.login === "apache" && projectId.name === "pekko")
        targetAmount$ = 30_000 * 100;
      else if (
        projectId.ownerId.login === "join-the-flock" &&
        projectId.name === "flock"
      )
        targetAmount$ = 10_000 * 100;
      else if (
        projectId.ownerId.login === "slick" &&
        projectId.name === "slick"
      )
        targetAmount$ = 3_000 * 100;
    } else if (projectId instanceof OwnerId) {
      if (projectId.login === "open-source-economy") targetAmount$ = 1000 * 100;
    }

    return targetAmount$;
  },

  convertTargetAmountToCurrencies(
    targetAmount$: number,
  ): Record<Currency, number> {
    return Object.values(Currency).reduce(
      (acc, currency) => {
        acc[currency] = currencyAPI.convertPrice(
          targetAmount$,
          Currency.USD,
          currency as Currency,
        );
        return acc;
      },
      {} as Record<Currency, number>,
    );
  },
};

export const CampaignController: CampaignController = {
  async getCampaign(
    req: Request<
      dto.GetCampaignParams,
      dto.ResponseBody<dto.GetCampaignResponse>,
      dto.GetCampaignBody,
      dto.GetCampaignQuery
    >,
    res: Response<dto.ResponseBody<dto.GetCampaignResponse>>,
  ) {
    const projectId = ProjectUtils.getId(req.params.owner, req.params.repo);
    const prices = await CampaignHelper.getPrices(
      projectId,
      CAMPAIGN_PRICE_CONFIGS,
    );

    logger.debug(`Prices: `, prices);

    const raisedAmount =
      await CampaignHelpers.calculateRaisedAmounts(projectId);
    const targetAmount$ = CampaignHelpers.getTargetAmount(projectId);
    const targetAmount =
      CampaignHelpers.convertTargetAmountToCurrencies(targetAmount$);

    const response: dto.GetCampaignResponse = {
      raisedAmount: raisedAmount,
      targetAmount: targetAmount,
      prices,
    };
    res.status(StatusCodes.OK).send({ success: response });
  },
};
