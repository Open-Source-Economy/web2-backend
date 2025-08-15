import { 
  IncomeStreamType, 
  OpenToOtherOpportunityType, 
  CurrencyType 
} from "../../model/onboarding/DeveloperSettings";

export interface SetDeveloperSettingsDto {
  incomeStreams: IncomeStreamType[];
  hourlyWeeklyCommitment: number;
  openToOtherOpportunity: OpenToOtherOpportunityType;
  hourlyRate: number;
  currency: CurrencyType;
}