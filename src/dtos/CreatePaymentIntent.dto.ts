import { StripeCustomerId } from "../model";
import { PriceItem } from "./stripe";

export interface CreatePaymentIntentDto {
  stripeCustomerId: StripeCustomerId;
  priceItems: PriceItem[];
}
