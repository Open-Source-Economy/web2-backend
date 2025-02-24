import { getStripeInvoiceRepository } from "./StripeInvoice.repository";
import { getStripeInvoiceLineRepository } from "./StripeInvoiceLine.repository";
import { getStripeCustomerUserRepository } from "./StripeCustomerUser.repository";
import { getStripeProductRepository } from "./StripeProduct.repository";
import { getStripePriceRepository } from "./StripePrice.repository";
import { getStripeCustomerRepository } from "./StripeCustomer.repository";
import { getStripeMiscellaneousRepository } from "./StripeMiscellaneous.repository";
import { getCombinedStripeRepository } from "./CombinedStripe.repository";

export * from "./StripeInvoiceLine.repository";
export * from "./StripeInvoice.repository";
export * from "./StripeCustomerUser.repository";
export * from "./StripeCustomer.repository";
export * from "./StripeProduct.repository";
export * from "./StripePrice.repository";
export * from "./StripeMiscellaneous.repository";

export const stripeCustomerUserRepo = getStripeCustomerUserRepository();
export const stripeCustomerRepo = getStripeCustomerRepository();
export const stripeProductRepo = getStripeProductRepository();
export const stripePriceRepo = getStripePriceRepository();
export const stripeInvoiceLineRepo = getStripeInvoiceLineRepository();
export const stripeInvoiceRepo = getStripeInvoiceRepository();
export const stripeMiscellaneousRepository = getStripeMiscellaneousRepository();
export const combinedStripeRepo = getCombinedStripeRepository();
