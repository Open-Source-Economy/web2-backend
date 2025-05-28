import {
  Currency,
  PlanProductType,
  productTypeUtils,
  StripeProduct,
  StripeProductId,
} from "../../api/model";
import { StatusCodes } from "http-status-codes";
import { stripeProductRepo } from "../../db";
import { ApiError } from "../../api/model/error/ApiError";
import { stripe, StripeHelper } from "../stripe";
import Stripe from "stripe";

export interface PlanHelper {
  createProductsAndPrices(): Promise<void>;
}

// Helper functions
const PlanHelpers = {
  productName(productType: PlanProductType): string {
    switch (productType) {
      case PlanProductType.INDIVIDUAL_PLAN:
        return "Individual Plan";
      case PlanProductType.START_UP_PLAN:
        return "Start-up Plan";
      case PlanProductType.SCALE_UP_PLAN:
        return "Scale-up Plan";
      case PlanProductType.ENTERPRISE_PLAN:
        return "Enterprise Plan";
      default:
        throw new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          `Unknown product type: ${productType}`,
        );
    }
  },

  productDescription(productType: PlanProductType): string {
    return "Access expert support. Fund critical dependencies.";
  },

  /**
   * Returns the monthly prices in cents for each plan type and currency
   * @param productType The plan product type
   * @returns Record mapping each currency to its price in cents
   */
  monthly$CentsPrices(productType: PlanProductType): Record<Currency, number> {
    switch (productType) {
      case PlanProductType.INDIVIDUAL_PLAN:
        return {
          [Currency.USD]: 99_00,
          [Currency.EUR]: 99_00,
          [Currency.GBP]: 79_00,
          [Currency.CHF]: 89_00,
        };
      case PlanProductType.START_UP_PLAN:
        return {
          [Currency.USD]: 499_00,
          [Currency.EUR]: 449_00,
          [Currency.GBP]: 399_00,
          [Currency.CHF]: 449_00,
        };
      case PlanProductType.SCALE_UP_PLAN:
        return {
          [Currency.USD]: 999_00,
          [Currency.EUR]: 999_00,
          [Currency.GBP]: 799_00,
          [Currency.CHF]: 899_00,
        };
      case PlanProductType.ENTERPRISE_PLAN:
        return {
          [Currency.USD]: 2499_00,
          [Currency.EUR]: 2499_00,
          [Currency.GBP]: 1999_00,
          [Currency.CHF]: 2299_00,
        };
      default:
        throw new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          `Unknown product type: ${productType}`,
        );
    }
  },

  /**
   * Returns the yearly prices in cents for each plan type and currency with 20% discount
   * @param productType The plan product type
   * @returns Record mapping each currency to its price in cents
   */
  yearly$CentsPrices(productType: PlanProductType): Record<Currency, number> {
    // Get monthly prices
    const monthlyPrices = PlanHelpers.monthly$CentsPrices(productType);

    // Calculate yearly prices with 20% discount and round to whole dollars
    const result: Record<Currency, number> = {} as Record<Currency, number>;

    for (const currency of Object.values(Currency)) {
      // Calculate: monthly price * 12 months * 0.8 (20% off)
      // Price per month should be rounded to whole currency unit (divide by 100, round, multiply by 100)
      const monthlyPrice =
        Math.round((monthlyPrices[currency] * 0.8) / 100) * 100;
      result[currency] = monthlyPrice * 12;
    }

    return result;
  },

  async createProductAndPrices(
    productType: PlanProductType,
    params: Stripe.ProductCreateParams,
    monthlyCentsPrices: Record<Currency, number>,
    yearlyCentsPrices: Record<Currency, number>,
  ): Promise<void> {
    const product: Stripe.Product = await stripe.products.create(params);

    await stripeProductRepo.insert(
      new StripeProduct(
        new StripeProductId(product.id),
        null,
        productTypeUtils.toProductType(productType),
      ),
    );

    // --- monthly price ---
    const monthlyOptions: Stripe.PriceCreateParams.Recurring = {
      interval: "month",
    };
    await StripeHelper.createAndStoreStripePrices(
      product,
      monthlyCentsPrices,
      monthlyOptions,
    );

    // --- yearly price ---
    const yearlyOptions: Stripe.PriceCreateParams.Recurring = {
      interval: "year",
    };
    await StripeHelper.createAndStoreStripePrices(
      product,
      yearlyCentsPrices,
      yearlyOptions,
    );
  },
};

export const PlanHelper: PlanHelper = {
  async createProductsAndPrices() {
    const images: string[] | undefined = undefined;

    for (const productType of Object.values(
      PlanProductType,
    ) as PlanProductType[]) {
      const productParams: Stripe.ProductCreateParams = {
        name: PlanHelpers.productName(productType),
        type: "service",
        images: images,
        shippable: false,
        description: PlanHelpers.productDescription(productType),
      };

      await PlanHelpers.createProductAndPrices(
        productType,
        productParams,
        PlanHelpers.monthly$CentsPrices(productType),
        PlanHelpers.yearly$CentsPrices(productType),
      );
    }
  },
};
