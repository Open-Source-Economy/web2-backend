import { CurrencyApi, getCurrencyAPI } from "./currency.service";

export * from "./github.service";
export * from "./mail.service";
export * from "./currency.service";

export const currencyAPI: CurrencyApi = getCurrencyAPI();
