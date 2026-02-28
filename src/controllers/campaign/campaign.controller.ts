import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  OwnerId,
  RepositoryId,
} from "@open-source-economy/api-types";
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
  "This made my day!",
  "Thanks a bunch!",
  "You rock!",
  "You're awesome!",
  "Wow, incredible!",
  "Amazing generosity!",
  "Absolutely fantastic!",
  "Legendary support!",
];

const CAMPAIGN_CURRENCY_AMOUNTS: Record<Currency, number[]> = Object.values(Currency).reduce(
  (acc, currency) => {
    acc[currency] = [15, 30, 50, 100, 250, 500, 750, 1000].map((amount) => amount * 100); // in cents
    return acc;
  },
  {} as Record<Currency, number[]>
);

export const CAMPAIGN_PRICE_CONFIGS: CampaignProductPriceConfig = Object.entries(CAMPAIGN_CURRENCY_AMOUNTS).reduce(
  (acc, [currency, amounts]) => {
    if (amounts.length !== CAMPAIGN_DONATION_LABELS.length) {
      throw new Error(
        `Currency ${currency} has ${amounts.length} amounts but there are ${CAMPAIGN_DONATION_LABELS.length} labels`
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
  {} as CampaignProductPriceConfig
);

export interface CampaignController {
  getCampaign(
    req: Request<dto.GetCampaignParams, dto.GetCampaignResponse, {}, dto.GetCampaignQuery>,
    res: Response<dto.GetCampaignResponse>
  ): Promise<void>;
}

// Helper functions
const CampaignHelpers = {
  async calculateRaisedAmounts(projectId: RepositoryId | OwnerId): Promise<Record<Currency, number>> {
    const raisedAmountPerCurrency = await stripeMiscellaneousRepository.getRaisedAmountPerCurrency(projectId);

    const raisedAmount: Record<Currency, number> = Object.values(Currency).reduce(
      (acc, currency) => {
        acc[currency] = 0;
        return acc;
      },
      {} as Record<Currency, number>
    );

    // For each target currency
    Object.values(Currency).forEach((targetCurrency) => {
      // Sum up converted amounts from all source currencies
      Object.entries(raisedAmountPerCurrency).forEach(([sourceCurrency, amount]) => {
        raisedAmount[targetCurrency] += currencyAPI.convertPrice(
          amount,
          sourceCurrency as Currency,
          targetCurrency as Currency
        );
      });
    });

    logger.debug(`Raised amount per currency`, raisedAmountPerCurrency);
    logger.debug(`Raised amount`, raisedAmount);

    return raisedAmount;
  },

  getTargetAmount(projectId: RepositoryId | OwnerId): number {
    let targetAmount$: number = 2_000 * 100; // default target amount

    // Check if it's a RepositoryId (has ownerId and name properties)
    if ("ownerId" in projectId && "name" in projectId) {
      const repoId = projectId as RepositoryId;
      if (repoId.ownerId.login === "apache" && repoId.name === "pekko") targetAmount$ = 30_000 * 100;
      else if (repoId.ownerId.login === "join-the-flock" && repoId.name === "flock") targetAmount$ = 10_000 * 100;
      else if (repoId.ownerId.login === "slick" && repoId.name === "slick") targetAmount$ = 3_000 * 100;
    } else if ("login" in projectId) {
      // It's an OwnerId
      if (projectId.login === "open-source-economy") targetAmount$ = 1000 * 100;
    }

    return targetAmount$;
  },

  convertTargetAmountToCurrencies(targetAmount$: number): Record<Currency, number> {
    return Object.values(Currency).reduce(
      (acc, currency) => {
        acc[currency] = currencyAPI.convertPrice(targetAmount$, Currency.USD, currency as Currency);
        return acc;
      },
      {} as Record<Currency, number>
    );
  },
};

export const CampaignController: CampaignController = {
  async getCampaign(
    req: Request<dto.GetCampaignParams, dto.GetCampaignResponse, {}, dto.GetCampaignQuery>,
    res: Response<dto.GetCampaignResponse>
  ) {
    const ownerId: OwnerId = { login: req.params.owner };
    const projectId: OwnerId | RepositoryId = req.params.repo ? { ownerId, name: req.params.repo } : ownerId;
    const prices = await CampaignHelper.getPrices(projectId, CAMPAIGN_PRICE_CONFIGS);

    logger.debug(`Prices: `, prices);

    const raisedAmount = await CampaignHelpers.calculateRaisedAmounts(projectId);
    const targetAmount$ = CampaignHelpers.getTargetAmount(projectId);
    const targetAmount = CampaignHelpers.convertTargetAmountToCurrencies(targetAmount$);

    const response: dto.GetCampaignResponse = {
      raisedAmount: raisedAmount,
      targetAmount: targetAmount,
      prices,
    };
    res.status(StatusCodes.OK).send(response);
  },
};
