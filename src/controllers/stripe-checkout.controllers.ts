import {Request, Response} from "express";
import {
    getAddressRepository,
    getStripeCustomerRepository,
    getStripeInvoiceRepository,
    getStripeProductRepository,
    getUserRepository,
} from "../db/";
import Stripe from "stripe";
import {
    CreateCustomerBody,
    CreateCustomerParams, CreateCustomerQuery, CreateCustomerResponse,
    CreateSubscriptionBody,
    CreateSubscriptionParams,
    CreateSubscriptionQuery,
    CreateSubscriptionResponse,
    ResponseBody,
} from "../dtos";
import {config} from "../config";
import {StatusCodes} from "http-status-codes";
import {StripeCustomer, StripeCustomerId} from "../model";
import {ApiError} from "../model/error/ApiError";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();

const stripe = new Stripe(config.stripe.secretKey);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

const addressRepo = getAddressRepository();
const stripeProductRepo = getStripeProductRepository();

// Build-subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?lang=node
// 1. createCustomer
// 2. createSubscription
export class StripeCheckoutController {
    static async createCustomer(
        req: Request<
            CreateCustomerParams,
            ResponseBody<CreateCustomerResponse>,
            CreateCustomerBody,
            CreateCustomerQuery
        >,
        res: Response<ResponseBody<CreateCustomerResponse>>,
    ) {
        if (!req.user) {
            return res.status(StatusCodes.UNAUTHORIZED).send();
        } else {
            const address = await addressRepo.getCompanyUserAddress(req.user.id);
            let stripeAddress: Stripe.Emptyable<Stripe.AddressParam>;
            if (address) {
                stripeAddress = address;
            } else {
                stripeAddress = {
                    country: req.body.countryCode,
                };
            }

            const customerCreateParams: Stripe.CustomerCreateParams = {
                description: req.user.id.toString(),
                email: req.user.email() ?? undefined,
                address: stripeAddress,
            };

            const customer: Stripe.Customer = await stripe.customers.create(customerCreateParams);
            const stripeCustomer: StripeCustomer = new StripeCustomer(
                new StripeCustomerId(customer.id),
                req.user.id,
            );

            await stripeCustomerRepo.insert(stripeCustomer);

            const response: CreateCustomerResponse = {
                stripeCustomer: stripeCustomer,
            };

            return res.status(StatusCodes.CREATED).send({ success: response });
        }
    }


}
