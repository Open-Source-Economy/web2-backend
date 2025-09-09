import { Currency } from "@open-source-economy/api-types";

/**
 *
 * @param base$Rates USD to other currencies. Ex: 1 USD = 0.8 GBP will be [Currency.GBP]: 80,
 *
 */
export function getCurrencyAPI(
  base$Rates?: Record<Currency, number>,
): CurrencyApi {
  if (!base$Rates) {
    base$Rates = {
      [Currency.USD]: 1,
      [Currency.EUR]: 1,
      [Currency.GBP]: 0.8, // 1 USD = 0.80 GBP
      [Currency.CHF]: 0.9,
    };
  }
  return new CurrencyApiImpl(base$Rates);
}

export interface CurrencyApi {
  /**
   * Convert an amount from one currency to another using current exchange rates
   * @param amount Amount in the smallest currency unit - in the [fromCurrency] (e.g., cents for USD/EUR, pence for GBP, centimes for CHF)
   * @param fromCurrency Source currency to convert from
   * @param toCurrency Target currency to convert to
   * @returns Converted amount in the smallest unit of target currency, rounded to nearest integer
   * @throws {Error} If amount is negative
   * @example
   * // Convert $50.00 USD to GBP
   * convertPrice(5000, Currency.USD, Currency.GBP) // returns 4000 (£40.00)
   */
  convertPrice(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): number;

  /**
   * Get converted prices for all currencies
   *
   * @param $price Price in USD cents
   */
  getConvertedPrices($price: number): Record<Currency, number>;
}

class CurrencyApiImpl implements CurrencyApi {
  private readonly base$Rates: Record<Currency, number>;
  private readonly conversionRates: Record<Currency, Record<Currency, number>>;

  constructor(baseRates: Record<Currency, number>) {
    this.base$Rates = baseRates;

    // Generate the full matrix programmatically
    this.conversionRates = Object.values(Currency).reduce(
      (acc, fromCurrency) => {
        acc[fromCurrency] = Object.values(Currency).reduce(
          (rates, toCurrency) => {
            rates[toCurrency] =
              this.base$Rates[toCurrency] / this.base$Rates[fromCurrency];
            return rates;
          },
          {} as Record<Currency, number>,
        );
        return acc;
      },
      {} as Record<Currency, Record<Currency, number>>,
    );
  }

  convertPrice(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): number {
    if (amount < 0) {
      throw new Error("Currency amount must be positive");
    }
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rate = this.conversionRates[fromCurrency][toCurrency];
    return Math.round(amount * rate);
  }

  getConvertedPrices($price: number): Record<Currency, number> {
    const record = {} as Record<Currency, number>;

    for (const currency of Object.values(Currency) as Currency[]) {
      record[currency] = this.convertPrice($price, Currency.USD, currency);
    }

    return record;
  }
}
