import { StripeCustomerId, UserId } from "../model";

export interface CreateSubscriptionDto {
  userId: UserId;
  stripeCustomerId: StripeCustomerId;
  paymentMethodId: string; // TODO: real type
  priceId: string; // TODO: real type
}
