import { CampaignPriceType, CampaignProductType, Currency } from "../model";
import { Price } from "./stripe";

export interface GetCampaignParams {
  owner: string;
  repo?: string;
}

export interface GetCampaignResponse {
  raisedAmount: Record<Currency, number>; // in cents, in the currency of the price
  targetAmount: Record<Currency, number>; // in cents, in the currency of the price
  numberOfBackers?: number;
  numberOfDaysLeft?: number;
  prices: Record<
    CampaignPriceType,
    Record<Currency, Record<CampaignProductType, Price[]>>
  >;
  description: CampaignDescription | null; // TODO: when description will come from the backend, remove null
}

export interface GetCampaignBody {}

export interface GetCampaignQuery {}

/*TODO: where to place it? */
export interface CampaignDescription {
  summary: CampaignSummary;
}

export enum SummaryType {
  ONE,
  TWO,
}

export interface CampaignSummary {
  title: string;
  subtitle: string;
  summaryType: SummaryType;
}
