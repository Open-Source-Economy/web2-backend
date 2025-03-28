import { ServerClient } from "postmark";
import { config, logger } from "../config";
import { Company, Owner, Repository } from "../api/model";
import { promises as fs } from "fs";
import path from "path";
import { ensureNoEndingTrailingSlash } from "../utils";

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
}
