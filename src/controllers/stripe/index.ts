import Stripe from "stripe";
import { config } from "../../config";

export * from "./stripe-checkout.controller";
export * from "./stripe-webhook.controller";
export * from "./stripe.helper";

export const stripe = new Stripe(config.stripe.secretKey);
