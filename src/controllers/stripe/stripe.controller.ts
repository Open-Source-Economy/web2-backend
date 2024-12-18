import {
  getAddressRepository,
  getStripeCustomerRepository,
  getStripeInvoiceRepository,
  getStripeProductRepository,
  getUserRepository,
} from "../../db/";
import Stripe from "stripe";
import { StripeCustomer, StripeCustomerId } from "../../model";
import { config } from "../../config";
import { ApiError } from "../../model/error/ApiError";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();

const stripe = new Stripe(config.stripe.secretKey);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

const addressRepo = getAddressRepository();
const stripeProductRepo = getStripeProductRepository();

export class StripeController {
  // to read:
  // Subscriptions with multiple products: https://docs.stripe.com/billing/subscriptions/multiple-products

  static async getOrCreateStripeCustomer(
    user: Express.User,
    countryCode: string | null,
  ): Promise<StripeCustomer | ApiError> {
    const exiting = await stripeCustomerRepo.getByUserId(user.id);

    if (exiting) return exiting;
    else {
      const address = await addressRepo.getCompanyUserAddress(user.id);
      let stripeAddress: Stripe.Emptyable<Stripe.AddressParam>;
      if (address) {
        stripeAddress = address;
      } else {
        stripeAddress = {
          country: countryCode ?? undefined,
        };
      }

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: user.id.toString(),
        email: user.email() ?? undefined,
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
}
