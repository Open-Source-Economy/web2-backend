"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const postmark_1 = require("postmark");
const config_1 = require("../config");
// TODO
class MailService {
    constructor() {
        // TODO: make a data structure and a test to be sure to that this url exists
        this.registerURL = `${config_1.config.frontEndUrl}/sign-up`;
        this.client = new postmark_1.ServerClient(config_1.config.email.postmarkApiToken);
    }
    sendMail(to, subject, text) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.sendEmail({
                From: config_1.config.email.from,
                To: to,
                Subject: subject,
                TextBody: text,
            });
        });
    }
    // TODO: create a good email
    sendCompanyAdminInvite(toName, toEmail, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = "Invite to register";
            const resetPasswordUrl = `${this.registerURL}?company_token=${token}`;
            config_1.logger.debug(`Sending email to ${toEmail} with invite link ${resetPasswordUrl}`);
            const text = `Dear ${toName ? toName : ""},,
        Register to Open Source Economy: ${resetPasswordUrl}`;
            yield this.sendMail(toEmail, subject, text);
        });
    }
    sendRepositoryAdminInvite(toName, toEmail, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = "Invite to register";
            const resetPasswordUrl = `${this.registerURL}?repository_token=${token}`;
            config_1.logger.debug(`Sending email to ${toEmail} with invite link ${resetPasswordUrl}`);
            const text = `Dear ${toName ? toName : ""},,
        Register to Open Source Economy: ${resetPasswordUrl}`;
            yield this.sendMail(toEmail, subject, text);
        });
    }
}
exports.MailService = MailService;
