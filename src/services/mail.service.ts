import { ServerClient } from "postmark";
import { config, logger } from "../config";

// TODO
export class MailService {
  // TODO: make a data structure and a test to be sure to that this url exists
  private registerURL: string = `${config.frontEndUrl}/sign-up`;

  private client: ServerClient;

  constructor() {
    this.client = new ServerClient(config.email.postmarkApiToken);
  }

  async sendMail(to: string, subject: string, text: string) {
    await this.client.sendEmail({
      From: config.email.from,
      To: to,
      Subject: subject,
      TextBody: text,
    });
  }

  // TODO: create a good email
  async sendCompanyAdminInvite(
    toName: string | null,
    toEmail: string,
    token: string,
  ) {
    const subject = "Invite to register";
    const resetPasswordUrl = `${this.registerURL}?company_token=${token}`;

    logger.debug(
      `Sending email to ${toEmail} with invite link ${resetPasswordUrl}`,
    );

    const text = `Dear ${toName ? toName : ""},,
        Register to Open Source Economy: ${resetPasswordUrl}`;

    await this.sendMail(toEmail, subject, text);
  }

  async sendRepositoryAdminInvite(
    toName: string | null,
    toEmail: string,
    token: string,
  ) {
    const subject = "Invite to register";
    const resetPasswordUrl = `${this.registerURL}?repository_token=${token}`;

    logger.debug(
      `Sending email to ${toEmail} with invite link ${resetPasswordUrl}`,
    );

    const text = `Dear ${toName ? toName : ""},,
        Register to Open Source Economy: ${resetPasswordUrl}`;

    await this.sendMail(toEmail, subject, text);
  }

  //     async sendResetPasswordEmail(to: string, token: string) {
  //         const subject = "Reset password";
  //         const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  //         const text = `Dear user,
  // To reset your password, click on this link: ${resetPasswordUrl}
  // If you did not request any password resets, then ignore this email.`;
  //         await this.sendMail(to, subject, text);
  //     }
  //
  //     async sendVerificationEmail(to: string, token: string) {
  //         const subject = "Email Verification";
  //         const verificationEmailUrl = `http://localhost:3000/api/v1/auth/login/email/verify?token=${token}`;
  //         const text = `Dear user, To verify your email, click on this link: ${verificationEmailUrl}`;
  //
  //         await this.sendMail(to, subject, text);
  //     }
}
