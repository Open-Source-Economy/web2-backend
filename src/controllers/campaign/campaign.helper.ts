import { Price } from "../../dtos";
import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  productTypeUtils,
  Project,
  ProjectId,
  StripePrice,
  StripeProduct,
  StripeProductId,
} from "../../model";
import { StatusCodes } from "http-status-codes";
import { combinedStripeRepo, stripeProductRepo } from "../../db";
import { ApiError } from "../../model/error/ApiError";
import { stripe, StripeHelper } from "../stripe";
import { currencyAPI } from "../../services";
import { logger } from "../../config";
import Stripe from "stripe";
import { CampaignProductPriceConfig } from "./campaign.controller";

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
    throw new ApiError(StatusCodes.NOT_IMPLEMENTED, "Price type not supported");
  }
}

export class CampaignHelper {
  // Donation to Pekko: One product, several prices (100$, 200$, 500$), several currencies (USD, EUR, GBP)
  // To read: https://support.stripe.com/questions/how-to-accept-donations-through-stripe
  static async createProductsAndPrices(project: Project) {
    let repoName = `${project.owner.id.login}`;
    if (project.repository) repoName += `/${project.repository.id.name}`;

    const images = project.owner.avatarUrl
      ? [project.owner.avatarUrl]
      : undefined;

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

    await CampaignHelper.createProductAndPrices(
      project.id,
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

    await CampaignHelper.createProductAndPrices(
      project.id,
      CampaignProductType.DONATION,
      donationParams,
      donationUnits,
      donationUnits,
    );
  }

  static async getPrices(
    projectId: ProjectId,
    currencyPriceConfigs: CampaignProductPriceConfig,
  ): Promise<
    Record<
      CampaignPriceType,
      Record<Currency, Record<CampaignProductType, Price[]>>
    >
  > {
    const prices = CampaignHelper.initializePrices();

    // Get campaign products with their prices
    const productsWithPrices: Record<
      CampaignProductType,
      [StripeProduct, Record<Currency, Record<CampaignPriceType, StripePrice>>]
    > = await combinedStripeRepo.getCampaignProductsWithPrices(projectId);

    // Iterate over the products - fix is here
    for (const campaignProductType in productsWithPrices) {
      const typedProductType = campaignProductType as CampaignProductType;
      const [product, pricesByCurrency] = productsWithPrices[typedProductType];

      logger.debug("Product type:", typedProductType);
      logger.debug("Product:", product);
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
  }

  private static initializePrices(): Record<
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
  }

  private static async createProductAndPrices(
    projectId: ProjectId,
    campaignProductType: CampaignProductType,
    params: Stripe.ProductCreateParams,
    recurringCentsPrices: Record<Currency, number>,
    oneTimeCentsPrices: Record<Currency, number>,
  ) {
    const product: Stripe.Product = await stripe.products.create(params);

    await stripeProductRepo.insert(
      new StripeProduct(
        new StripeProductId(product.id),
        projectId,
        productTypeUtils.toProductType(campaignProductType),
      ),
    );

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
  }
}
