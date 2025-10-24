import { ServerClient } from "postmark";
import { config, logger } from "../config";
import {
  Company,
  Owner,
  Repository,
  ContactReason,
} from "@open-source-economy/api-types";
import { promises as fs } from "fs";
import path from "path";
import { ensureNoEndingTrailingSlash } from "../utils";

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
}
