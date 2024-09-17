import {StripeCustomerId, UserId} from "../model";

export interface CreatePaymentIntentDto {
  userId: UserId;
  stripeCustomerId: StripeCustomerId;
  paymentMethodId: string; // TODO: real type
  priceId: string;// TODO: real type

  currency: string;
}
