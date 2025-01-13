import {
  stripeCustomerRepo,
  stripeCustomerUserRepo,
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
  PriceType,
  ProductType,
  Repository,
  RepositoryId,
  StripeCustomer,
  StripeCustomerId,
  StripeCustomerUser,
  StripePrice,
  StripeProduct,
  StripeProductId,
} from "../../model";
import { ApiError } from "../../model/error/ApiError";
import { StatusCodes } from "http-status-codes";
import { stripe } from "./index";
import { logger } from "../../config";
import { Price } from "../../dtos";
import { ValidationError } from "../../model/error";
import { currencyAPI } from "../../services";

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

// price number is in $ cents
function getPrices($price: number): Record<Currency, number> {
  const record = {} as Record<Currency, number>;

  for (const currency of Object.values(Currency) as Currency[]) {
    record[currency] = currencyAPI.convertPrice($price, Currency.USD, currency);
  }

  return record;
}

export class StripeHelper {
  // to read:
  // Subscriptions with multiple products: https://docs.stripe.com/billing/subscriptions/multiple-products
  static async getOrCreateStripeCustomerUser(
    user: Express.User,
    countryCode: string | null,
  ): Promise<StripeCustomerUser | ApiError> {
    const exiting = await stripeCustomerUserRepo.getByUserId(user.id);

    if (exiting) {
      logger.debug("Stripe customer already exists", exiting);
      return exiting;
    } else {
      const companies: [CompanyId, CompanyUserRole][] =
        await userCompanyRepo.getByUserId(user.id);
      if (companies.length > 1) {
        return new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          "Multiple companies not supported",
        );
      } else if (companies.length === 1) {
        return new ApiError(
          StatusCodes.NOT_IMPLEMENTED,
          "Company user not supported yes ",
        );

        // const address = await addressRepo.getCompanyUserAddress(user.id);
      }

      let stripeAddress: Stripe.Emptyable<Stripe.AddressParam> = {
        country: countryCode ?? undefined,
      };

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: user.id.toString(),
        email: user.email() ?? undefined,
        address: stripeAddress,
      };

      logger.debug("Creating Stripe customer", customerCreateParams);

      const customer: Stripe.Customer =
        await stripe.customers.create(customerCreateParams);
      const stripeCustomer = StripeCustomer.fromStripeApi(customer);
      if (stripeCustomer instanceof ValidationError) throw stripeCustomer;
      const stripeCustomerUser: StripeCustomerUser = new StripeCustomerUser(
        new StripeCustomerId(customer.id),
        user.id,
      );

      await stripeCustomerRepo.insert(stripeCustomer);
      await stripeCustomerUserRepo.insert(stripeCustomerUser);

      return stripeCustomerUser;
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

  static async getPrices(
    repositoryId: RepositoryId,
    currencyPriceConfigs: Record<Currency, [number, string][]>,
  ): Promise<
    Record<PriceType, Record<Currency, Record<ProductType, Price[]>>>
  > {
    const prices = StripeHelper.initializePrices();

    const products = await stripeProductRepo.getByRepositoryId(repositoryId);

    logger.debug("Products", products);

    for (const product of products) {
      const productPrices = await stripePriceRepo.getActivePricesByProductId(
        product.stripeId,
      );
      logger.debug("Product prices", productPrices);

      for (const [currency, stripePrices] of Object.entries(productPrices)) {
        const parsedCurrency = currency as Currency;
        const currencyConfigs = currencyPriceConfigs[parsedCurrency];
        if (
          !stripePrices ||
          stripePrices.length !== Object.keys(PriceType).length
        ) {
          logger.error("Unexpected price configuration for product", {
            productStripeId: product.stripeId,
            currency: currency,
            stripePrices: stripePrices,
            message: "Expected exactly one price per product and price type",
          });
          throw new Error(
            `Expected exactly one price per price type in product ${product.stripeId} in currency ${currency}`,
          );
        }

        for (const stripePrice of stripePrices) {
          if (stripePrice.unitAmount <= 0) {
            logger.error("Stripe price unit amount is not strictly positive", {
              productStripeId: product.stripeId,
              unitAmount: stripePrice.unitAmount,
              message:
                "The unit amount for the given Stripe price is invalid (non-positive)",
            });
            throw new Error(
              `Stripe price unit amount is not strictly positive for product ${product.stripeId}`,
            );
          }

          for (const [amount, label] of currencyConfigs) {
            prices[stripePrice.type][parsedCurrency][product.type].push({
              totalAmount: amount,
              quantity: Math.floor(amount / stripePrice.unitAmount),
              label,
              price: stripePrice,
            });
          }
        }
      }
    }

    return prices;
  }

  private static initializePrices(): Record<
    PriceType,
    Record<Currency, Record<ProductType, Price[]>>
  > {
    return Object.values(PriceType).reduce(
      (priceTypeAcc, priceType) => {
        priceTypeAcc[priceType] = Object.values(Currency).reduce(
          (currencyAcc, currency) => {
            currencyAcc[currency] = Object.values(ProductType).reduce(
              (productAcc, productType) => {
                productAcc[productType] = [];
                return productAcc;
              },
              {} as Record<ProductType, Price[]>,
            );
            return currencyAcc;
          },
          {} as Record<Currency, Record<ProductType, Price[]>>,
        );
        return priceTypeAcc;
      },
      {} as Record<PriceType, Record<Currency, Record<ProductType, Price[]>>>,
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
