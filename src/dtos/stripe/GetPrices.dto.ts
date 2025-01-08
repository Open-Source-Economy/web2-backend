import { Currency, ProductType, StripePrice } from "../../model";

export interface GetPricesParams {
  owner: string;
  repo: string;
}

export interface Price {
  totalAmount: number; // in cents, in the currency of the price
  quantity: number;
  label: string;
  price: StripePrice;
}

export interface GetPricesResponse {
  prices: Record<ProductType, Record<Currency, Price[]>>;
}

export interface GetPricesBody {}

export interface GetPricesQuery {}
