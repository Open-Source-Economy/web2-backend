import {
  addressRepo,
  stripeCustomerRepo,
  stripePriceRepo,
  stripeProductRepo,
  userCompanyRepo,
} from "../../db/";
import Stripe from "stripe";
import {
  CompanyId,
  CompanyUserRole,
  Currency,
  Owner,
  ProductType,
  Repository,
  RepositoryId,
  StripeCustomer,
  StripeCustomerId,
  StripePrice,
  StripeProduct,
  StripeProductId,
} from "../../model";
import { ApiError } from "../../model/error/ApiError";
import { StatusCodes } from "http-status-codes";
import { stripe } from "./index";
import { logger } from "../../config";

// 1 DoW - recurring payment: 1200$
// 1 DoW - one-time payment: 1500$

// 1 milliDoW (0.001 DoW) - recurring payment = 1.2$
// 1 milliDoW (0.001 DoW) - one-time payment  = 1.5$

// If the user pays 10$ - recurring payment - they receive 1 DoW * 15$ / 1.2$ = 12 milliDoW (12.5, rounded down)
// If the user pays 10$ - one-time payment - they receive 1 DoW * 15$ / 1.5$ = 10 DoW

const milliDowRecurring$CentsPrice: number = 120;
const milliDowOneTime$CentsPrice: number = 150;
const donationUnits: Record<Currency, number> = {
  [Currency.USD]: 100,
  [Currency.EUR]: 100,
  [Currency.GBP]: 100,
  [Currency.CHF]: 100,
};

// USD to EUR, GBP, CHF
// Ex: 1 USD = 0.8 GBP
const conversionRates: Record<Currency, number> = {
  [Currency.USD]: 1,
  [Currency.EUR]: 1,
  [Currency.GBP]: 0.8,
  [Currency.CHF]: 0.9,
};

function getConvertedPrice(usdPrice: number, currency: Currency): number {
  return Math.floor(usdPrice * conversionRates[currency]); // round down
}

// price number is in $ cents
function getPrices($price: number): Record<Currency, number> {
  const record = {} as Record<Currency, number>;

  for (const currency of Object.values(Currency) as Currency[]) {
    record[currency] =
      currency === Currency.USD ? $price : getConvertedPrice($price, currency);
  }

  return record;
}

export class StripeHelper {
  // to read:
  // Subscriptions with multiple products: https://docs.stripe.com/billing/subscriptions/multiple-products
  static async getOrCreateStripeCustomer(
    user: Express.User,
    countryCode: string | null,
  ): Promise<StripeCustomer | ApiError> {
    const exiting = await stripeCustomerRepo.getByUserId(user.id);

    if (exiting) return exiting;
    else {
      const companies: [CompanyId, CompanyUserRole][] =
        await userCompanyRepo.getByUserId(user.id);
      if (companies.length > 1) {
        return new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          "Multiple companies not supported",
        );
      }

      let description: string;
      if (companies.length === 1) {
        const company = companies[0];
        description = company[0].toString();
      } else {
        description = user.id.toString();
      }

      const address = await addressRepo.getCompanyUserAddress(user.id);
      let stripeAddress: Stripe.Emptyable<Stripe.AddressParam>;
      if (address) {
        stripeAddress = address;
      } else {
        stripeAddress = {
          country: countryCode ?? undefined,
        };
      }

      let email: string | undefined;
      if (companies.length === 0) {
        email = user.email() ?? undefined;
      }

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: description,
        email: email,
        address: stripeAddress,
      };

      const customer: Stripe.Customer =
        await stripe.customers.create(customerCreateParams);
      const stripeCustomer: StripeCustomer = new StripeCustomer(
        new StripeCustomerId(customer.id),
        user.id,
      );

      await stripeCustomerRepo.insert(stripeCustomer);

      return stripeCustomer;
    }
  }

  // Donation to Pekko: One product, several prices (100$, 200$, 500$), several currencies (USD, EUR, GBP)
  // To read: https://support.stripe.com/questions/how-to-accept-donations-through-stripe
  static async createProductAndPrice(owner: Owner, repository: Repository) {
    const repoName = `${repository.id.ownerLogin()}/${repository.id.name}`;
    const images = owner.avatarUrl ? [owner.avatarUrl] : undefined;

    // --- milliDoW product ---

    const milliDowParams: Stripe.ProductCreateParams = {
      name: `DoW for ${repoName}`,
      type: "service",
      images: images,
      shippable: false,
      unit_label: "milliDoW",
      description: `Support the development of ${repoName} and receive DoW credits to prioritize your needs.`,
      // url: frontendUrl,
    };

    await StripeHelper.createProductAndPrices(
      repository.id,
      ProductType.milliDow,
      milliDowParams,
      getPrices(milliDowRecurring$CentsPrice),
      getPrices(milliDowOneTime$CentsPrice),
    );

    const donationParams: Stripe.ProductCreateParams = {
      name: `Donation for ${repoName}`,
      type: "service",
      images: images,
      shippable: false,
      description: `Donate to ${repoName} to support its maintainer and ongoing development.`,
      // url: frontendUrl,
    };

    await StripeHelper.createProductAndPrices(
      repository.id,
      ProductType.donation,
      donationParams,
      donationUnits,
      donationUnits,
    );
  }

  private static async createProductAndPrices(
    repositoryId: RepositoryId,
    productType: ProductType,
    params: Stripe.ProductCreateParams,
    recurringCentsPrices: Record<Currency, number>,
    oneTimeCentsPrices: Record<Currency, number>,
  ) {
    const product: Stripe.Product = await stripe.products.create(params);

    await stripeProductRepo.insert(
      new StripeProduct(
        new StripeProductId(product.id),
        repositoryId,
        productType,
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

  private static async createAndStoreStripePrices(
    product: Stripe.Product,
    prices: Record<Currency, number>,
    options?: Stripe.PriceCreateParams.Recurring,
  ) {
    const creationPromises = Object.entries(prices).map(
      async ([currency, price]) => {
        const priceParams: Stripe.PriceCreateParams = {
          currency: currency.toLowerCase(),
          unit_amount: price,
          product: product.id,
          recurring: options,
        };

        const priceResponse = await stripe.prices.create(priceParams);
        const stripePrice = StripePrice.fromStripeApi(priceResponse);

        if (stripePrice instanceof StripePrice) {
          await stripePriceRepo.insert(stripePrice);
        } else {
          logger.error(
            `${stripePrice} - received from Stripe: ${priceResponse}`,
          );
          throw stripePrice;
        }
      },
    );

    try {
      await Promise.all(creationPromises);
    } catch (error) {
      logger.error("Error creating a stripe price:", error);
      throw error;
    }
  }
}
