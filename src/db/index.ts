import { getAddressRepository } from "./Address.repository";
import { getManagedIssueRepository } from "./ManagedIssue.repository";
import { getIssueFundingRepository } from "./IssueFunding.repository";
import { getManualInvoiceRepository } from "./ManualInvoice.repository";
import { getNewsletterSubscriptionRepository } from "./NewsletterSubscription.repository";
import { getCreditRepository } from "./PlanAndCredits.repository";

export * from "./github/";
export * from "./stripe";
export * from "./user";
export * from "./project";
export * from "./user/User.repository";
export * from "./Company.repository";
export * from "./Address.repository";
export * from "./ManagedIssue.repository";
export * from "./FinancialIssue.repository";
export * from "./IssueFunding.repository";
export * from "./ManualInvoice.repository";
export * from "./PlanAndCredits.repository";

export const addressRepo = getAddressRepository();
export const planAndCreditsRepo = getCreditRepository();

export const managedIssueRepo = getManagedIssueRepository();
export const issueFundingRepo = getIssueFundingRepository();
// export const financialIssueRepo = getFinancialIssueRepository(); // Dependency injection problem
export const manualInvoiceRepo = getManualInvoiceRepository();

export const newsletterSubscriptionRepo = getNewsletterSubscriptionRepository();
