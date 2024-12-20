import {getAddressRepository, getStripeCustomerRepository, getUserCompanyRepository,} from "../../db/";
import Stripe from "stripe";
import {CompanyId, CompanyUserRole, StripeCustomer, StripeCustomerId} from "../../model";
import {config} from "../../config";
import {ApiError} from "../../model/error/ApiError";
import {StatusCodes} from "http-status-codes";


const stripe = new Stripe(config.stripe.secretKey);
const stripeCustomerRepo = getStripeCustomerRepository();
const userCompanyRepository = getUserCompanyRepository();
const addressRepo = getAddressRepository();

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
      const companies: [CompanyId, CompanyUserRole][] = await userCompanyRepository.getByUserId(user.id);
      if (companies.length > 1) {
        return new ApiError(StatusCodes.NOT_IMPLEMENTED, "Multiple companies not supported");
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
        email =  user.email() ?? undefined
      }

      const customerCreateParams: Stripe.CustomerCreateParams = {
        description: description,
        email: email,
        address: stripeAddress,
      };

      const customer: Stripe.Customer = await stripe.customers.create(customerCreateParams);
      const stripeCustomer: StripeCustomer = new StripeCustomer(
        new StripeCustomerId(customer.id),
        user.id,
      );

      await stripeCustomerRepo.insert(stripeCustomer);

      return stripeCustomer;
    }
  }
}
