export enum IncomeStreamType {
  ROYALTIES = "royalties",
  SERVICES = "services",
  DONATIONS = "donations",
}

export enum OpenToOtherOpportunityType {
  YES = "yes",
  MAYBE = "maybe",
  NO = "no",
}

export enum CurrencyType {
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
  CHF = "CHF",
}

export class DeveloperSettings {
  id!: string;
  developerProfileId!: string;
  incomeStreams!: IncomeStreamType[];
  hourlyWeeklyCommitment!: number;
  openToOtherOpportunity!: OpenToOtherOpportunityType;
  hourlyRate!: number;
  currency!: CurrencyType;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<DeveloperSettings>) {
    Object.assign(this, partial);
  }
}
