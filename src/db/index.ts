import { getAddressRepository } from "./Address.repository";
import { getManagedIssueRepository } from "./ManagedIssue.repository";
import { getIssueFundingRepository } from "./IssueFunding.repository";
import { getManualInvoiceRepository } from "./ManualInvoice.repository";
import { getNewsletterSubscriptionRepository } from "./NewsletterSubscription.repository";
import { getCreditRepository } from "./PlanAndCredits.repository";
import { getSponsorRepository } from "./Sponsor.repository";

export * from "./github/";
export * from "./stripe";
export * from "./user";
export * from "./project";
export * from "./onboarding";
export * from "./user/User.repository";
export * from "./Company.repository";
export * from "./Address.repository";
export * from "./ManagedIssue.repository";
export * from "./FinancialIssue.repository";
export * from "./IssueFunding.repository";
export * from "./ManualInvoice.repository";
export * from "./PlanAndCredits.repository";
export * from "./Sponsor.repository";

export const addressRepo = getAddressRepository();
export const planAndCreditsRepo = getCreditRepository();

export const managedIssueRepo = getManagedIssueRepository();
export const issueFundingRepo = getIssueFundingRepository();
// export const financialIssueRepo = getFinancialIssueRepository(); // Dependency injection problem
export const manualInvoiceRepo = getManualInvoiceRepository();
import { getUserRepositoryRepository } from "./user/UserRepository.repository";
import { getPasswordResetTokenRepository } from "./user/PasswordResetToken.repository";

export const userRepositoryRepo = getUserRepositoryRepository();
export const passwordResetTokenRepo = getPasswordResetTokenRepository();

export const newsletterSubscriptionRepo = getNewsletterSubscriptionRepository();
export const sponsorRepo = getSponsorRepository();
