import { StripeCustomerId } from "../model";
import { PriceItem } from "./stripe";

export interface CreateSubscriptionDto {
  stripeCustomerId: StripeCustomerId;
  priceItems: PriceItem[];
}
