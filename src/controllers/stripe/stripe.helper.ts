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
  StripePrice,
} from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { stripe } from "./index";
import { logger } from "../../config";
import { ApiError } from "../../errors";

// StripeCustomerUser is removed from api-types; define a local interface
interface StripeCustomerUser {
  stripeCustomerId: StripeCustomerId;
  userId: any;
}

export interface StripeHelper {
  getOrCreateStripeCustomerUser(
    user: Express.User,
    countryCode: string | null,
  ): Promise<StripeCustomerUser | ApiError>;

  createAndStoreStripePrices(
    product: Stripe.Product,
    prices: Record<Currency, number>,
    options?: Stripe.PriceCreateParams.Recurring,
  ): Promise<void>;
}

export const StripeHelper: StripeHelper = {
  // to read:
  // Subscriptions with multiple products: https://docs.stripe.com/billing/subscriptions/multiple-products
  async getOrCreateStripeCustomerUser(
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
        return ApiError.internal("Multiple companies not supported");
      }

      let stripeAddress: Stripe.Emptyable<Stripe.AddressParam> = {
        country: countryCode ?? undefined,
      };

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: user.id as string,
        email: (user as any).email ?? undefined,
        address: stripeAddress,
      };

      logger.debug("Creating Stripe customer", customerCreateParams);

      const customer: Stripe.Customer =
        await stripe.customers.create(customerCreateParams);
      const stripeCustomer: StripeCustomer = {
        stripeId: customer.id as StripeCustomerId,
        currency: undefined,
        email: customer.email ?? undefined,
        name: customer.name ?? undefined,
      };
      const stripeCustomerUser: StripeCustomerUser = {
        stripeCustomerId: customer.id as StripeCustomerId,
        userId: user.id,
      };

      await stripeCustomerRepo.insert(stripeCustomer);
      await stripeCustomerUserRepo.insert(stripeCustomerUser);

      return stripeCustomerUser;
    }
  },

  async createAndStoreStripePrices(
    product: Stripe.Product,
    prices: Record<Currency, number>,
    options?: Stripe.PriceCreateParams.Recurring,
  ): Promise<void> {
    const creationPromises = Object.entries(prices).map(
      async ([currency, price]) => {
        const priceParams: Stripe.PriceCreateParams = {
          currency: currency.toLowerCase(),
          unit_amount: price,
          product: product.id,
          recurring: options,
        };

        const priceResponse = await stripe.prices.create(priceParams);
        const stripePrice: StripePrice = {
          id: priceResponse.id as any,
          stripeProductId: product.id as any,
          currency: currency.toUpperCase() as Currency,
          unitAmount: priceResponse.unit_amount ?? 0,
          recurring: priceResponse.recurring ? true : false,
          interval: priceResponse.recurring?.interval ?? null,
          active: priceResponse.active,
        } as any;

        await stripePriceRepo.createOrUpdate(stripePrice);
      },
    );

    try {
      await Promise.all(creationPromises);
    } catch (error) {
      logger.error("Error creating a stripe price:", error);
      throw error;
    }
  },
};
