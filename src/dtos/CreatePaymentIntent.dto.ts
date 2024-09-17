import { StripeCustomerId, UserId } from "../model";

interface InvoiceItem {
  priceId: string;
  quantity: number;
}

export interface CreatePaymentIntentDto {
  userId: UserId;
  stripeCustomerId: StripeCustomerId;
  paymentMethodId: string; // TODO: real type

  invoiceItems: InvoiceItem[];
}
