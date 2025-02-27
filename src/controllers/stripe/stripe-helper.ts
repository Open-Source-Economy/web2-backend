import {
  stripeCustomerRepo,
  stripeCustomerUserRepo,
  stripePriceRepo,
  userCompanyRepo,
} from "../../db/";
import Stripe from "stripe";
import {
  CompanyId,
  CompanyUserRole,
  Currency,
  StripeCustomer,
  StripeCustomerId,
  StripeCustomerUser,
  StripePrice,
  userUtils,
} from "../../model";
import { ApiError } from "../../model/error/ApiError";
import { StatusCodes } from "http-status-codes";
import { stripe } from "./index";
import { logger } from "../../config";
import { ValidationError } from "../../model/error";

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
        description: user.id.uuid,
        email: userUtils.email(user) ?? undefined,
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

  static async createAndStoreStripePrices(
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
          await stripePriceRepo.createOrUpdate(stripePrice);
        } else {
          logger.error(`${stripePrice} - received from Stripe}`, priceResponse);
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
