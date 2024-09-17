import {Request, Response} from "express";
import {getStripeCustomerRepository, getStripeInvoiceRepository, getUserRepository} from "../db/";
import {StatusCodes} from "http-status-codes";
import Stripe from "stripe";
import {CreateUserQueryParams} from "../types/query-params";
import {CreateLocalUserDto} from "../dtos";
import {CreateCustomerDto} from "../dtos/CreateCustomer.dto";
import {CompanyId, StripeCustomer, StripeCustomerId, StripeInvoice, UserId} from "../model";
import {ValidationError} from "express-validator";
import {CreateSubscriptionDto} from "../dtos/CreateSubscription.dto";
import {CreatePaymentIntentDto} from "../dtos/CreatePaymentIntent.dto";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not found");
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET not found");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const stripeInvoiceRepo = getStripeInvoiceRepository();
const stripeCustomerRepo = getStripeCustomerRepository();

export class ShopController {

    static shouldCalculateTax = false;

    private static async calculateTax(orderAmount: number, currency: string) {
        const taxCalculation = await stripe.tax.calculations.create({
            currency,
            customer_details: {
                address: {
                    line1: "10709 Cleary Blvd",
                    city: "Plantation",
                    state: "FL",
                    postal_code: "33322",
                    country: "US",
                },
                address_source: "shipping",
            },
            line_items: [
                {
                    amount: orderAmount,
                    reference: "ProductRef",
                    tax_behavior: "exclusive",
                    tax_code: "txcd_30011000"
                }
            ],
        });

        return taxCalculation;
    }

    static async createCustomer(
        req: Request<{}, {}, CreateCustomerDto, {}>,
        res: Response<StripeCustomer | ValidationError[]>,
    ) {
        const customer = await stripe.customers.create({
            description: req.body.userId.toString(),
            email: req.body.email,
        });

        const stripeCustomer = new StripeCustomer(new StripeCustomerId(customer.id), req.body.userId, req.body.companyId);

        await stripeCustomerRepo.insert(stripeCustomer);

        // Create a SetupIntent to set up our payment methods recurring usage
        const setupIntent = await stripe.setupIntents.create({
            payment_method_types: ["card", "au_becs_debit"], // TODO: lolo
            customer: customer.id,
        });

        return res
            .status(StatusCodes.CREATED)
            .send(stripeCustomer)
    }

    static async checkout(request: Request, response: Response) {
        await stripe.products
            .create({
                name: "Starter Subscription",
                description: "$12/Month subscription",
            })
            .then((product) => {
                stripe.prices
                    .create({
                        unit_amount: 1200,
                        currency: "usd",
                        recurring: {
                            interval: "month",
                        },
                        product: product.id,
                    })
                    .then((price) => {
                        console.log(
                            "Success! Here is your starter subscription product id: " +
                            product.id,
                        );
                        console.log(
                            "Success! Here is your starter subscription price id: " +
                            price.id,
                        );
                    });
            });

        return request.user
            ? response.send(request.user)
            : response.sendStatus(StatusCodes.UNAUTHORIZED);
    }

    static async createSubscription(
        req: Request<{}, {}, CreateSubscriptionDto, {}>,
        res: Response<Stripe.Subscription | ValidationError[]>
    ) {
        // Set the default payment method on the customer
        try {
            await stripe.paymentMethods.attach(req.body.paymentMethodId, {
                customer: req.body.stripeCustomerId.toString(),
            });
        } catch (error) {
            console.log(error);
            return res
                .status(StatusCodes.PAYMENT_REQUIRED)
        }

        // Set the default payment method on the customer
        await stripe.customers.update(req.body.stripeCustomerId.toString(), {
            invoice_settings: {
                default_payment_method: req.body.paymentMethodId,
            },
        });

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: req.body.stripeCustomerId.toString(),
            items: [{price: process.env[req.body.priceId]}],
            // expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
        });

        res.send(subscription);
    }

    static async createPaymentIntent(
        req: Request<{}, {}, CreatePaymentIntentDto, {}>,
        res: Response) {
        let orderAmount = 1400;
        let paymentIntent: Stripe.PaymentIntent;


        try {

            if (ShopController.shouldCalculateTax) {
                let taxCalculation = await ShopController.calculateTax(orderAmount, req.body.currency);

                paymentIntent = await stripe.paymentIntents.create({
                    currency: 'usd',
                    amount: taxCalculation.amount_total,
                    automatic_payment_methods: { enabled: true },
                    metadata: { tax_calculation: taxCalculation.id }
                });
            }
            else {
                paymentIntent = await stripe.paymentIntents.create({
                    currency: req.body.currency,
                    amount: orderAmount,
                    customer: req.body.stripeCustomerId.toString(),
                    automatic_payment_methods: { enabled: true }
                });
            }

            // Send publishable key and PaymentIntent client_secret to client.
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        }
        catch (e) {
            let message: string;
            if (typeof e === "string") {
                message = e;
            } else if (e instanceof Error) {
                message = e.message;
            }
            res.status(400).send({ error: { message } });
        }
    }

    static async oneTimePayment(
        req: Request<{}, {}, CreateSubscriptionDto, {}>,
        res: Response) {
        const session =  await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                // name:
                // description:
                amount: p.productId.price * 100,
                currency: 'usd',
                quantity: p.quantity
            }],
            success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        })

        res.send(paymentIntent);
    }

    static async webhook(req: Request, res: Response) {
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                // @ts-ignore
                req.headers["stripe-signature"],
                process.env.STRIPE_WEBHOOK_SECRET,
            );
        } catch (err) {
            console.error(`⚠️  Webhook signature verification failed.`, err);
            return res.sendStatus(StatusCodes.BAD_REQUEST);
        }

        const data = event.data.object;

        // Handle the event
        // Review important events for Billing webhooks
        // https://stripe.com/docs/billing/webhooks
        // Remove comment to see the various objects sent for this sample
        // Event types: https://docs.stripe.com/api/events/types
        switch (event.type) {
            // https://docs.stripe.com/billing/subscriptions/webhooks#active-subscriptions
            case "invoice.paid":
                const invoice = StripeInvoice.fromStripeApi(data)
                if (invoice instanceof Error) {
                    throw invoice;
                }

                await stripeInvoiceRepo.insert(invoice);
                break;
            default:
        }

        res.sendStatus(StatusCodes.OK);
    }
}
