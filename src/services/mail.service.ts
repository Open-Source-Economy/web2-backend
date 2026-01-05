import { ServerClient } from "postmark";
import { config, logger } from "../config";
import {
  Company,
  FullDeveloperProfile,
  Owner,
  Repository,
  User,
  userUtils,
} from "@open-source-economy/api-types";
import { promises as fs } from "fs";
import * as path from "path";
import { ensureNoEndingTrailingSlash } from "../utils";

// ContactReason labels for contact form emails
enum ContactReason {
  MAINTAINER = "maintainer",
  REQUEST_PROJECT = "request-project",
  ENTERPRISE = "enterprise",
  PARTNERSHIP = "partnership",
  VOLUNTEER = "volunteer",
  PRESS = "press",
  SUPPORT = "support",
  GENERAL = "general",
}

const CONTACT_REASON_LABELS: Record<ContactReason, string> = {
  [ContactReason.MAINTAINER]: "I'm an Open Source Maintainer",
  [ContactReason.REQUEST_PROJECT]: "Request a Project",
  [ContactReason.ENTERPRISE]: "Enterprise Inquiry",
  [ContactReason.PARTNERSHIP]: "Partnership Opportunity",
  [ContactReason.VOLUNTEER]: "Join Our Community",
  [ContactReason.PRESS]: "Press & Media",
  [ContactReason.SUPPORT]: "Get Help",
  [ContactReason.GENERAL]: "General Inquiry",
};

export class MailService {
  private registerURL: string = `${config.frontEndUrl}/sign-up`;

  private client: ServerClient;

  constructor() {
    this.client = new ServerClient(config.email.postmarkApiToken);
  }

  private async sendMail(to: string, subject: string, html?: string) {
    await this.client.sendEmail({
      From: config.email.from,
      To: to,
      Subject: subject,
      HtmlBody: html,
    });
  }

  async sendCompanyAdminInvite(
    toName: string | null,
    toEmail: string,
    company: Company,
    token: string,
  ) {
    const subject = `Open Source Economy - Register as ${company.name} admin`;

    const setUpYourAccountLink = `${this.registerURL}?company_token=${token}`;

    logger.info(
      `Sending email to ${toEmail} with company invite link ${setUpYourAccountLink}`,
    );

    // Read the HTML file
    const htmlFilePath = path.join(
      __dirname,
      "company-template/register-as-company-admin.html",
    );
    let htmlContent = await fs.readFile(htmlFilePath, "utf-8");

    // Replace placeholders in the HTML with dynamic values
    htmlContent = htmlContent
      .replace("{{toName}}", toName || "")
      .replace("{{companyName}}", company.name)
      .replace("{{setUpYourAccountLink}}", setUpYourAccountLink)
      .replace("{{websiteLink}}", config.frontEndUrl);

    // images replacement
    htmlContent = htmlContent
      .replace(
        "{{background}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/company-template/pink_main_img.png`,
      )
      .replace(
        "{{background-mobile}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/company-template/pink_main_img_mobile.jpg`,
      )
      .replace(
        "{{ose-logo}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/common-images/cat_img.png`,
      )
      .replace(
        /{{checkmark-user-color}}/g,
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/company-template/pink_checkmark.png`,
      )
      .replace(
        "{{lauriane-signature}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/common-images/signature.png`,
      );

    // Send email with both text and HTML
    await this.sendMail(toEmail, subject, htmlContent);
  }

  async sendRepositoryAdminInvite(
    toName: string | null,
    toEmail: string,
    user: Owner,
    owner: Owner,
    repository: Repository,
    token: string,
  ): Promise<void> {
    const subject = `Open Source Economy - Register as ${owner.id.login}/${repository.id.name} admin`;

    const setUpYourAccountLink = `${this.registerURL}?repository_token=${token}`;
    const userLogin: string = user.id.login;
    const userProfileUrl: string =
      user.avatarUrl ?? `https://i.imghippo.com/files/lEXI9914lM.png`;
    const repositoryName: string = repository.id.name;
    const repositoryUrl: string | null = repository.htmlUrl;
    const repositoryAvatarUrl: string =
      owner.avatarUrl ?? `https://i.imghippo.com/files/Jyuv9682tIk.png`;

    logger.info(
      `Sending email to ${toEmail} with repository invite link ${setUpYourAccountLink}`,
    );

    // Read the HTML file
    const htmlFilePath = path.join(
      __dirname,
      "register-template/register-as-maintainer-admin.html",
    );
    let htmlContent = await fs.readFile(htmlFilePath, "utf-8");

    // Replace placeholders in the HTML with dynamic values
    htmlContent = htmlContent
      .replace("{{toName}}", toName || userLogin)
      .replace("{{setUpYourAccountLink}}", setUpYourAccountLink)
      .replace("{{userLogin}}", userLogin)
      .replace("{{userProfileUrl}}", userProfileUrl)
      .replace("{{repositoryName}}", repositoryName)
      .replace("{{repositoryUrl}}", repositoryUrl || "")
      .replace("{{repositoryAvatarUrl}}", repositoryAvatarUrl)
      .replace("{{websiteLink}}", config.frontEndUrl);
    // images replacement
    htmlContent = htmlContent
      .replace(
        "{{background}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/company-template/pink_main_img.png`,
      )
      .replace(
        "{{background-mobile}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/company-template/pink_main_img_mobile.jpg`,
      )
      .replace(
        "{{ose-logo}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/common-images/cat_img.png`,
      )
      .replace(
        "{{fragment}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/register-template/fragment.png`,
      )
      .replace(
        /{{checkmark-developer-color}}/g,
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/register-template/orange_checkmark.png`,
      )
      .replace(
        "{{lauriane-signature}}",
        `${ensureNoEndingTrailingSlash(config.host)}/public/images/email-assets/common-images/signature.png`,
      );

    // htmlContent = htmlContent
    //     .replace(/{{toName}}/g, toName || userLogin)
    //     .replace(/{{setUpYourAccountLink}}/g, setUpYourAccountLink)
    //     .replace(/{{userLogin}}/g, userLogin)
    //     .replace(/{{userProfileUrl}}/g, userProfileUrl)
    //     .replace(/{{repositoryName}}/g, repositoryName)
    //     .replace(/{{repositoryUrl}}/g, repositoryUrl || "")
    //     .replace(/{{repositoryAvatarUrl}}/g, repositoryAvatarUrl);

    // Send email with both text and HTML
    await this.sendMail(toEmail, subject, htmlContent);
  }

  async sendWebsiteAdminNotification(subject: string, message: string) {
    await this.sendMail(config.email.from, subject, message);
  }

  async sendDeveloperOnboardingCompletionEmail(
    fullProfile: FullDeveloperProfile,
    user: User,
  ) {
    // Read the HTML template file
    const htmlFilePath = path.join(
      __dirname,
      "onboarding-template/developer-onboarding-completion.html",
    );
    let htmlContent = await fs.readFile(htmlFilePath, "utf-8");

    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Build GitHub section
    const githubData = userUtils.githubData(user);
    const githubSection = githubData?.owner.id.login
      ? `<div class="item-detail"><strong>GitHub:</strong> <a href="https://github.com/${githubData.owner.id.login}">@${githubData.owner.id.login}</a></div>`
      : "";

    // Build projects section
    const projectsSection =
      fullProfile.projects.length > 0
        ? fullProfile.projects
            .map((entry, index) => {
              const projectItem = entry.projectItem;
              const developerProjectItem = entry.developerProjectItem;
              const sourceIdentifier = projectItem.sourceIdentifier;

              let name = "Unknown";
              let url = "Unknown";

              if (typeof sourceIdentifier === "string") {
                name = sourceIdentifier;
                url = sourceIdentifier;
              } else if ("login" in sourceIdentifier) {
                name = sourceIdentifier.login;
                url = `https://github.com/${sourceIdentifier.login}`;
              } else if (
                "name" in sourceIdentifier &&
                "ownerId" in sourceIdentifier
              ) {
                const ownerLogin =
                  typeof sourceIdentifier.ownerId === "object" &&
                  "login" in sourceIdentifier.ownerId
                    ? sourceIdentifier.ownerId.login
                    : String(sourceIdentifier.ownerId);
                name = `${ownerLogin}/${sourceIdentifier.name}`;
                url = `https://github.com/${ownerLogin}/${sourceIdentifier.name}`;
              }

              const roleText = developerProjectItem.roles?.[0]
                ? `<div class="item-detail"><strong>Role:</strong> ${developerProjectItem.roles[0]}</div>`
                : "";
              const mergeRightsText = developerProjectItem.mergeRights?.[0]
                ? `<div class="item-detail"><strong>Access:</strong> ${developerProjectItem.mergeRights[0]}</div>`
                : "";

              return `
              <div class="item-card">
                <div class="item-title">${index + 1}. ${name}</div>
                <div class="item-detail"><strong>URL:</strong> <a href="${url}">${url}</a></div>
                <div class="item-detail"><strong>Type:</strong> ${projectItem.projectItemType}</div>
                ${roleText}
                ${mergeRightsText}
              </div>
            `;
            })
            .join("")
        : "<div style='color: #6b7280; font-style: italic; margin-left: 20px;'>No projects added</div>";

    // Build services section
    const servicesSection =
      fullProfile.services.length > 0
        ? fullProfile.services
            .map((entry, index) => {
              const service = entry.service;
              const developerService = entry.developerService;

              if (!developerService) return "";

              // Get project names for this service
              const serviceProjectNames: string[] = [];
              for (const projectItemId of developerService.developerProjectItemIds) {
                const projectEntry = fullProfile.projects.find(
                  (p) => p.developerProjectItem.id.uuid === projectItemId.uuid,
                );
                if (projectEntry) {
                  const sourceIdentifier =
                    projectEntry.projectItem.sourceIdentifier;
                  if (typeof sourceIdentifier === "string") {
                    serviceProjectNames.push(sourceIdentifier);
                  } else if ("login" in sourceIdentifier) {
                    serviceProjectNames.push(sourceIdentifier.login);
                  } else if (
                    "name" in sourceIdentifier &&
                    "ownerId" in sourceIdentifier
                  ) {
                    const ownerLogin =
                      typeof sourceIdentifier.ownerId === "object" &&
                      "login" in sourceIdentifier.ownerId
                        ? sourceIdentifier.ownerId.login
                        : String(sourceIdentifier.ownerId);
                    serviceProjectNames.push(
                      `${ownerLogin}/${sourceIdentifier.name}`,
                    );
                  }
                }
              }

              const customRateText = developerService.hourlyRate
                ? `<div class="item-detail"><strong>Custom Rate:</strong> ${fullProfile.settings?.currency || "USD"} ${developerService.hourlyRate}/hr</div>`
                : "";
              const responseTimeText = developerService.responseTimeHours
                ? `<div class="item-detail"><strong>Response Time:</strong> ${developerService.responseTimeHours}</div>`
                : "";
              const commentText = developerService.comment
                ? `<div class="comment-box"><strong>Comment:</strong><br>${developerService.comment.replace(/\n/g, "<br>")}</div>`
                : "";

              return `
              <div class="item-card service">
                <div class="item-title">${index + 1}. ${service.name}</div>
                <div class="item-detail"><strong>Category:</strong> ${service.serviceType}</div>
                ${customRateText}
                ${responseTimeText}
                <div class="item-detail"><strong>Projects:</strong> ${serviceProjectNames.length > 0 ? serviceProjectNames.join(", ") : "All projects"}</div>
                ${commentText}
              </div>
            `;
            })
            .join("")
        : "<div style='color: #6b7280; font-style: italic; margin-left: 20px;'>No services added</div>";

    // Build settings section
    const settingsSection = fullProfile.settings
      ? (() => {
          // Build preferences display
          const preferences = [];
          if (fullProfile.settings!.servicesPreference) {
            preferences.push(
              `Services: ${fullProfile.settings!.servicesPreference}`,
            );
          }
          if (fullProfile.settings!.royaltiesPreference) {
            preferences.push(
              `Common Pot: ${fullProfile.settings!.royaltiesPreference}`,
            );
          }
          if (fullProfile.settings!.communitySupporterPreference) {
            preferences.push(
              `Community Supporter: ${fullProfile.settings!.communitySupporterPreference}`,
            );
          }
          const incomeStreamsText =
            preferences.length > 0
              ? `<div class="item-detail"><strong>Participation Preferences:</strong> ${preferences.join(", ")}</div>`
              : "";
          const availabilityText =
            fullProfile.settings!.hourlyWeeklyCommitment !== undefined &&
            fullProfile.settings!.hourlyWeeklyCommitment !== null
              ? `<div class="item-detail"><strong>Weekly Availability:</strong> ${fullProfile.settings!.hourlyWeeklyCommitment} hours</div>`
              : "";
          const availabilityCommentText = fullProfile.settings!
            .hourlyWeeklyCommitmentComment
            ? `<div class="comment-box">${fullProfile.settings!.hourlyWeeklyCommitmentComment.replace(/\n/g, "<br>")}</div>`
            : "";
          const baseRateText =
            fullProfile.settings!.hourlyRate !== undefined &&
            fullProfile.settings!.hourlyRate !== null
              ? `<div class="item-detail"><strong>Base Hourly Rate:</strong> ${fullProfile.settings!.currency || "USD"} ${fullProfile.settings!.hourlyRate}/hr</div>`
              : "";
          const baseRateCommentText = fullProfile.settings!.hourlyRateComment
            ? `<div class="comment-box">${fullProfile.settings!.hourlyRateComment.replace(/\n/g, "<br>")}</div>`
            : "";
          const opportunitiesText =
            fullProfile.settings!.openToOtherOpportunity !== undefined &&
            fullProfile.settings!.openToOtherOpportunity !== null
              ? `<div class="item-detail"><strong>Open to Other Opportunities:</strong> ${fullProfile.settings!.openToOtherOpportunity ? "Yes" : "No"}</div>`
              : "";
          const opportunitiesCommentText = fullProfile.settings!
            .openToOtherOpportunityComment
            ? `<div class="comment-box">${fullProfile.settings!.openToOtherOpportunityComment.replace(/\n/g, "<br>")}</div>`
            : "";

          return `
            <div class="info-box">
              ${incomeStreamsText}
              ${availabilityText}
              ${availabilityCommentText}
              ${baseRateText}
              ${baseRateCommentText}
              ${opportunitiesText}
              ${opportunitiesCommentText}
            </div>
          `;
        })()
      : "<div style='color: #6b7280; font-style: italic; margin-left: 20px;'>No settings configured</div>";

    // Replace placeholders in the HTML template
    htmlContent = htmlContent
      .replace("{{developerName}}", user.name || "Unknown")
      .replace(
        "{{developerEmail}}",
        fullProfile.profileEntry?.profile.contactEmail || "Unknown",
      )
      .replace(
        /{{developerEmail}}/g,
        fullProfile.profileEntry?.profile.contactEmail || "Unknown",
      )
      .replace("{{githubSection}}", githubSection)
      .replace("{{projectCount}}", fullProfile.projects.length.toString())
      .replace("{{projectsSection}}", projectsSection)
      .replace("{{settingsSection}}", settingsSection)
      .replace("{{serviceCount}}", fullProfile.services.length.toString())
      .replace("{{servicesSection}}", servicesSection)
      .replace("{{timestamp}}", timestamp)
      .replace(
        "{{dashboardLink}}",
        `${config.frontEndUrl}/developer-onboarding`,
      );

    const emailSubject = `🚀 New Developer Onboarding: ${user.name || "Unknown"}`;

    await this.sendMail(
      config.email.contactRecipient,
      emailSubject,
      htmlContent,
    );

    logger.info(
      `Developer onboarding completion email sent for ${user.name} (${
        fullProfile.profileEntry?.profile.contactEmail || "Unknown"
      })`,
    );
  }

  async sendDeveloperWelcomeEmail(
    developerName: string,
    developerEmail: string,
  ) {
    // Read the HTML template file
    const htmlFilePath = path.join(
      __dirname,
      "onboarding-template/developer-confirmation-email.html",
    );
    let htmlContent = await fs.readFile(htmlFilePath, "utf-8");

    // Replace placeholders in the HTML
    htmlContent = htmlContent.replace("{{developerName}}", developerName);

    const emailSubject = "Welcome to Open Source Economy! 🎉";

    await this.sendMail(developerEmail, emailSubject, htmlContent);

    logger.info(`Welcome email sent to ${developerName} (${developerEmail})`);
  }

  async sendContactFormEmail(formData: {
    name: string;
    email: string;
    company: string;
    linkedinProfile: string;
    githubProfile?: string;
    contactReason: string;
    projects?: Array<{ url: string; role?: string }>;
    requestMeeting: boolean;
    meetingNotes?: string;
    subject: string;
    message: string;
  }) {
    const reasonLabel =
      CONTACT_REASON_LABELS[formData.contactReason as ContactReason] ||
      formData.contactReason;

    // Build the GitHub profile section
    const githubProfileSection = formData.githubProfile
      ? `
          <div>
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">GitHub Profile</strong>
            <div style="color: #1f2937; font-size: 15px; margin-top: 4px;">
              <a href="${formData.githubProfile}" style="color: #8b5cf6; text-decoration: none;" target="_blank">${formData.githubProfile}</a>
            </div>
          </div>
        `
      : "";

    // Build the projects section
    const projectsSection =
      formData.projects && formData.projects.length > 0
        ? `
        <div style="margin: 20px 0;">
          <strong style="color: #1f2937; font-size: 14px;">Projects:</strong>
          ${formData.projects
            .map(
              (project, index) => `
            <div style="margin-left: 20px; margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 6px;">
              <div><strong>Project ${index + 1}:</strong></div>
              <div style="margin-top: 5px;">
                <strong>URL:</strong> <a href="${project.url}" style="color: #8b5cf6;">${project.url}</a>
              </div>
              ${project.role ? `<div style="margin-top: 3px;"><strong>Role:</strong> ${project.role}</div>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      `
        : "";

    // Build the meeting section
    const meetingSection = formData.requestMeeting
      ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <strong style="color: #92400e; font-size: 14px;">📹 Meeting Requested</strong>
          </div>
          ${formData.meetingNotes ? `<div style="color: #78350f; font-size: 13px; margin-top: 8px;"><strong>Meeting Notes:</strong><br>${formData.meetingNotes.replace(/\n/g, "<br>")}</div>` : ""}
        </div>
      `
      : "";

    // Read the HTML template file
    const htmlFilePath = path.join(
      __dirname,
      "contact-template/contact-form-email.html",
    );
    let htmlContent = await fs.readFile(htmlFilePath, "utf-8");

    // Get formatted timestamp
    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Replace placeholders in the HTML with dynamic values
    htmlContent = htmlContent
      .replace("{{reasonLabel}}", reasonLabel)
      .replace("{{name}}", formData.name)
      .replace("{{email}}", formData.email)
      .replace(/{{email}}/g, formData.email)
      .replace("{{company}}", formData.company)
      .replace("{{linkedinProfile}}", formData.linkedinProfile)
      .replace(/{{linkedinProfile}}/g, formData.linkedinProfile)
      .replace("{{githubProfileSection}}", githubProfileSection)
      .replace("{{projectsSection}}", projectsSection)
      .replace("{{meetingSection}}", meetingSection)
      .replace("{{subject}}", formData.subject)
      .replace("{{message}}", formData.message)
      .replace("{{jsonData}}", JSON.stringify(formData, null, 2))
      .replace("{{timestamp}}", timestamp);

    const emailSubject = `[${reasonLabel}] ${formData.subject} - From ${formData.name}`;

    await this.sendMail(
      config.email.contactRecipient,
      emailSubject,
      htmlContent,
    );

    logger.info(
      `Contact form email sent from ${formData.email} regarding ${reasonLabel}`,
    );
  }

  async sendPasswordResetEmail(
    toEmail: string,
    token: string,
    name: string | null,
  ) {
    const subject = "Reset Your Password - Open Source Economy";
    const resetLink = `${config.frontEndUrl}/auth/reset-password?token=${token}`;

    logger.info(`Sending password reset email to ${toEmail}`);

    const htmlFilePath = path.join(
      __dirname,
      "auth-template/password-reset.html",
    );
    let htmlContent = await fs.readFile(htmlFilePath, "utf-8");

    htmlContent = htmlContent
      .replace("{{name}}", name || "")
      .replace("{{resetLink}}", resetLink);

    await this.sendMail(toEmail, subject, htmlContent);
  }
}
