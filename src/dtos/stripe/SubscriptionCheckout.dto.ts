import { PriceItem } from "./index";
import Stripe from "stripe";

export interface SubscriptionCheckoutParams {}

export interface SubscriptionCheckoutResponse {}

export interface SubscriptionCheckoutBody {
  priceItems: PriceItem[];
  countryCode: string | null;

  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionCheckoutQuery {}
