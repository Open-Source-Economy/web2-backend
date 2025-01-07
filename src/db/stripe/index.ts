import { getStripeInvoiceRepository } from "./StripeInvoice.repository";
import { getStripeInvoiceLineRepository } from "./StripeInvoiceLine.repository";
import { getStripeCustomerRepository } from "./StripeCustomer.repository";
import { getStripeProductRepository } from "./StripeProduct.repository";
import { getStripePriceRepository } from "./StripePrice.repository";

export * from "./StripeInvoiceLine.repository";
export * from "./StripeInvoice.repository";
export * from "./StripeCustomer.repository";
export * from "./StripeProduct.repository";
export * from "./StripePrice.repository";

export const stripeCustomerRepo = getStripeCustomerRepository();
export const stripeProductRepo = getStripeProductRepository();
export const stripePriceRepo = getStripePriceRepository();
export const stripeInvoiceLineRepo = getStripeInvoiceLineRepository();
export const stripeInvoiceRepo = getStripeInvoiceRepository();
