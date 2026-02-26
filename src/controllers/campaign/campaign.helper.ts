import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  OwnerId,
  Price,
  ProductType,
  Project,
  RepositoryId,
  StripePrice,
  StripeProduct,
  StripeProductId,
} from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { combinedStripeRepo, stripeProductRepo } from "../../db";
import { stripe, StripeHelper } from "../stripe";
import { currencyAPI } from "../../services";
import { logger } from "../../config";
import Stripe from "stripe";
import { CampaignProductPriceConfig } from "./campaign.controller";
import { ApiError } from "../../errors";

// 1 credit - one-time payment  = 2.3$
// 1 credit - recurring payment = 1.84$

// If the user pays 15$ - one-time payment - they receive 1 credit * 15$ / 2.3$ = 6 credit (6.52, rounded down)
// If the user pays 15$ - recurring payment - they receive 1 credit * 15$ / 1.84$ = 8 credit (8.15, rounded down)

// const creditOneTime$CentsPrice: number = 2.3 * 100;
// const creditRecurring$CentsPrice: number = 1.84 * 100;

const creditOneTime$CentsPrice: number = 4 * 100;
const creditRecurring$CentsPrice: number = 3.3 * 100;
const donationUnits: Record<Currency, number> = {
  [Currency.USD]: 100,
  [Currency.EUR]: 100,
  [Currency.GBP]: 100,
  [Currency.CHF]: 100,
};

export function getRoundedCreditAmount(
  price: number, // in cents
  currency: Currency,
  priceType: CampaignPriceType,
): number {
  const $amount = currencyAPI.convertPrice(price, currency, Currency.USD);
  if (priceType === CampaignPriceType.ONE_TIME) {
    return Math.floor($amount / creditOneTime$CentsPrice);
  } else if (priceType === CampaignPriceType.MONTHLY) {
    return Math.floor($amount / creditRecurring$CentsPrice);
  } else {
    throw ApiError.internal("Price type not supported");
  }
}

// Convert CampaignProductType to ProductType
function toProductType(campaignProductType: CampaignProductType): ProductType {
  return campaignProductType as unknown as ProductType;
}

export interface CampaignHelper {
  createProductsAndPrices(project: Project): Promise<void>;
  getPrices(
    projectId: OwnerId | RepositoryId,
    currencyPriceConfigs: CampaignProductPriceConfig,
  ): Promise<
    Record<
      CampaignPriceType,
      Record<Currency, Record<CampaignProductType, Price[]>>
    >
  >;
}

// Helper functions
const CampaignHelpers = {
  initializePrices(): Record<
    CampaignPriceType,
    Record<Currency, Record<CampaignProductType, Price[]>>
  > {
    return Object.values(CampaignPriceType).reduce(
      (priceTypeAcc, priceType) => {
        priceTypeAcc[priceType] = Object.values(Currency).reduce(
          (currencyAcc, currency) => {
            currencyAcc[currency] = Object.values(CampaignProductType).reduce(
              (productAcc, campaignProductType) => {
                productAcc[campaignProductType] = [];
                return productAcc;
              },
              {} as Record<CampaignProductType, Price[]>,
            );
            return currencyAcc;
          },
          {} as Record<Currency, Record<CampaignProductType, Price[]>>,
        );
        return priceTypeAcc;
      },
      {} as Record<
        CampaignPriceType,
        Record<Currency, Record<CampaignProductType, Price[]>>
      >,
    );
  },

  async createProductAndPrices(
    projectId: OwnerId | RepositoryId,
    campaignProductType: CampaignProductType,
    params: Stripe.ProductCreateParams,
    recurringCentsPrices: Record<Currency, number>,
    oneTimeCentsPrices: Record<Currency, number>,
  ): Promise<void> {
    const product: Stripe.Product = await stripe.products.create(params);

    // Serialize projectId as a string for storage
    const projectIdStr =
      "ownerId" in projectId
        ? `${projectId.ownerId.login}/${projectId.name}`
        : projectId.login;

    await stripeProductRepo.insert({
      id: product.id as unknown as StripeProductId,
      projectId: projectIdStr as any,
      productType: toProductType(campaignProductType),
    } as unknown as StripeProduct);

    const recurringOptions: Stripe.PriceCreateParams.Recurring = {
      interval: "month",
    };

    // --- recurring price ---
    await StripeHelper.createAndStoreStripePrices(
      product,
      recurringCentsPrices,
      recurringOptions,
    );

    // --- one time price ---
    await StripeHelper.createAndStoreStripePrices(product, oneTimeCentsPrices);
  },
};

export const CampaignHelper: CampaignHelper = {
  // Donation to Pekko: One product, several prices (100$, 200$, 500$), several currencies (USD, EUR, GBP)
  // To read: https://support.stripe.com/questions/how-to-accept-donations-through-stripe
  async createProductsAndPrices(project: Project): Promise<void> {
    let repoName = `${project.owner.id.login}`;
    if (project.repository) repoName += `/${project.repository.id.name}`;

    const images = project.owner.avatarUrl
      ? [project.owner.avatarUrl]
      : undefined;

    // Construct the projectId from the project
    const projectId: OwnerId | RepositoryId = project.repository
      ? project.repository.id
      : project.owner.id;

    // --- credit product ---

    const creditParams: Stripe.ProductCreateParams = {
      name: `Get Credits`,
      type: "service",
      images: images,
      shippable: false,
      unit_label: "credit",
      description: `Support the development of ${repoName} and receive credits to prioritize your needs.`,
      // url: frontendUrl,
    };

    await CampaignHelpers.createProductAndPrices(
      projectId,
      CampaignProductType.CREDIT,
      creditParams,
      currencyAPI.getConvertedPrices(creditRecurring$CentsPrice),
      currencyAPI.getConvertedPrices(creditOneTime$CentsPrice),
    );

    const donationParams: Stripe.ProductCreateParams = {
      name: `Donation for ${repoName}`,
      type: "service",
      images: images,
      shippable: false,
      description: `Donate to ${repoName} to support its maintainer and ongoing development.`,
      // url: frontendUrl,
    };

    await CampaignHelpers.createProductAndPrices(
      projectId,
      CampaignProductType.DONATION,
      donationParams,
      donationUnits,
      donationUnits,
    );
  },

  async getPrices(
    projectId: OwnerId | RepositoryId,
    currencyPriceConfigs: CampaignProductPriceConfig,
  ): Promise<
    Record<
      CampaignPriceType,
      Record<Currency, Record<CampaignProductType, Price[]>>
    >
  > {
    const prices = CampaignHelpers.initializePrices();

    // Get campaign products with their prices
    const productsWithPrices: Record<
      CampaignProductType,
      Record<Currency, Record<CampaignPriceType, StripePrice>>
    > = await combinedStripeRepo.getCampaignProductsWithPrices(projectId);

    // Iterate over the products - fix is here
    for (const campaignProductType in productsWithPrices) {
      const typedProductType = campaignProductType as CampaignProductType;
      const pricesByCurrency = productsWithPrices[typedProductType];

      logger.debug("Product type:", typedProductType);
      logger.debug("Product prices", pricesByCurrency);

      // Process each currency
      for (const currency in pricesByCurrency) {
        const stripePrices = pricesByCurrency[currency as Currency];
        logger.debug(`Prices for ${currency}: `, stripePrices);

        const parsedCurrency = currency as Currency;
        const currencyConfigs = currencyPriceConfigs[parsedCurrency];

        // Process each price type
        for (const priceType in stripePrices) {
          const typedPriceType = priceType as CampaignPriceType;
          const stripePrice = stripePrices[typedPriceType];

          // Create prices for each configured amount
          for (const [amount, labels] of currencyConfigs) {
            prices[typedPriceType][parsedCurrency][typedProductType].push({
              totalAmount: Number(amount),
              quantity: Math.floor(Number(amount) / stripePrice.unitAmount),
              label: labels[typedProductType][typedPriceType],
              price: stripePrice,
            });
          }
        }
      }
    }

    return prices;
  },
};
