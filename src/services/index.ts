import { CurrencyApi, getCurrencyAPI } from "./currency.service";
import { MailService } from "./mail.service";

export * from "./github.service";
export * from "./currency.service";

export const currencyAPI: CurrencyApi = getCurrencyAPI();
export const mailService = new MailService();
