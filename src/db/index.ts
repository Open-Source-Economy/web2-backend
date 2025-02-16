import { getAddressRepository } from "./Address.repository";
import { getCreditRepository } from "./Credit.repository";
import { getManagedIssueRepository } from "./ManagedIssue.repository";
import { getIssueFundingRepository } from "./IssueFunding.repository";
import { getManualInvoiceRepository } from "./ManualInvoice.repository";
import { getNewsletterSubscriptionRepository } from "./NewsletterSubscription.repository";

export * from "./github/";
export * from "./stripe";
export * from "./user";
export * from "./user/User.repository";
export * from "./Company.repository";
export * from "./Address.repository";
export * from "./ManagedIssue.repository";
export * from "./FinancialIssue.repository";
export * from "./IssueFunding.repository";
export * from "./ManualInvoice.repository";
export * from "./Credit.repository";

export const addressRepo = getAddressRepository();
export const creditRepo = getCreditRepository();

export const managedIssueRepo = getManagedIssueRepository();
export const issueFundingRepo = getIssueFundingRepository();
// export const financialIssueRepo = getFinancialIssueRepository(); // Dependency injection problem
export const manualInvoiceRepo = getManualInvoiceRepository();

export const newsletterSubscriptionRepo = getNewsletterSubscriptionRepository();
