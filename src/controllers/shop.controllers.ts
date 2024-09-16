import { Request, Response } from "express";
import { getUserRepository } from "../db/";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import { CreateUserQueryParams } from "../types/query-params";
import { CreateLocalUserDto } from "../dtos";
import { CreateCustomerDto } from "../dtos/CreateCustomer.dto";

// https://github.com/stripe-samples/subscriptions-with-card-and-direct-debit/blob/main/server/node/server.js
const userRepo = getUserRepository();
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY not found");
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET not found");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class ShopController {
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

  // TODO: to change
  static async createCustomer(
    req: Request<{}, {}, CreateCustomerDto, {}>,
    res: Response,
  ) {
    // Create a new customer object
    const customer = await stripe.customers.create({
      description: req.body.userId.toString(),
      email: req.body.email,
    });

    // Create a SetupIntent to set up our payment methods recurring usage
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ["card", "au_becs_debit"], // TODO: lolo
      customer: customer.id,
    });

    res.send({ customer, setupIntent });
  }

  static async createSubscription(req: Request, res: Response) {
    // Set the default payment method on the customer
    await stripe.customers.update(req.body.customerId, {
      invoice_settings: {
        default_payment_method: req.body.paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: req.body.customerId,
      items: [{ plan: process.env.SUBSCRIPTION_PLAN_ID }], // TODO: change
      expand: ["latest_invoice.payment_intent"],
    });
    res.send(subscription);
  }

  static async webhook(req: Request, res: Response) {
    console.log("Webhook received!");
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        // @ts-ignore
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      console.log(err);
      console.log(req.headers["stripe-signature"]);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    const dataObject = event.data.object;

    console.log(`Type: ${event.type}`);

    // Handle the event
    // Review important events for Billing webhooks
    // https://stripe.com/docs/billing/webhooks
    // Remove comment to see the various objects sent for this sample

    // Event types: https://docs.stripe.com/api/events/types
    switch (event.type) {
      // https://docs.stripe.com/billing/subscriptions/webhooks#active-subscriptions
      case "invoice.paid":
        console.log(`Event: ${JSON.stringify(dataObject, null, 2)}`);

        break;
      case "customer.updated":
        // console.log(dataObject);
        break;
      case "setup_intent.created":
        // console.log(dataObject);
        break;
      case "invoice.upcoming":
        // console.log(dataObject);
        break;
      case "invoice.created":
        // console.log(dataObject);
        break;
      case "invoice.finalized":
        // console.log(dataObject);
        break;
      case "invoice.payment_succeeded":
        // console.log(dataObject);
        break;
      case "invoice.payment_failed":
        // console.log(dataObject);
        break;
      case "customer.subscription.created":
        break;
      // ... handle other event types
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log(
          `PaymentIntent for ${paymentIntent.amount} was successful!`,
        );
        // Then define and call a method to handle the successful payment intent.
        // handlePaymentIntentSucceeded(paymentIntent);
        break;
      case "payment_method.attached":
        const paymentMethod = event.data.object;
        // Then define and call a method to handle the successful attachment of a PaymentMethod.
        // handlePaymentMethodAttached(paymentMethod);
        break;
      default:
      // Unexpected event type
    }
    res.sendStatus(200);
  }

  // static async register(
  //   request: Request<{}, {}, CreateLocalUserDto, CreateUserQueryParams>,
  //   response: Response<User | ValidationError[]>,
  // ) {
  //   const result = validationResult(request);
  //   if (!result.isEmpty())
  //     return response.status(StatusCodes.BAD_REQUEST).send(result.array());
  //
  //   try {
  //     const savedUser = await userRepo.insertLocal(request.body);
  //     return response.status(StatusCodes.CREATED).send(savedUser);
  //   } catch (err) {
  //     console.log("Error: ", err);
  //     return response.sendStatus(StatusCodes.BAD_REQUEST);
  //   }
  // }
}
