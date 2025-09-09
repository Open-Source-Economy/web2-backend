import { Currency } from "@open-source-economy/api-types";
import { getCurrencyAPI } from "../../services";

describe("Currency Conversion API", () => {
  let currencyTestAPI = getCurrencyAPI({
    [Currency.USD]: 100, // 1.00 USD (base currency)
    [Currency.EUR]: 100, // 1.00 EUR = 1.00 USD
    [Currency.GBP]: 80, // 0.80 GBP = 1.00 USD
    [Currency.CHF]: 90, // 0.90 CHF = 1.00 USD
  });

  describe("Currency conversion basics", () => {
    test("should maintain same amount for same currency", () => {
      const amounts = [1, 100, 5000, 10000, 1000000];
      amounts.forEach((amount) => {
        Object.values(Currency).forEach((currency) => {
          expect(
            currencyTestAPI.convertPrice(
              amount,
              currency as Currency,
              currency as Currency,
            ),
          ).toBe(amount);
        });
      });
    });

    test("should handle zero amount correctly", () => {
      Object.values(Currency).forEach((fromCurrency) => {
        Object.values(Currency).forEach((toCurrency) => {
          expect(
            currencyTestAPI.convertPrice(
              0,
              fromCurrency as Currency,
              toCurrency as Currency,
            ),
          ).toBe(0);
        });
      });
    });

    test("should handle minimum currency unit (1 cent)", () => {
      Object.values(Currency).forEach((fromCurrency) => {
        Object.values(Currency).forEach((toCurrency) => {
          expect(
            currencyTestAPI.convertPrice(
              1,
              fromCurrency as Currency,
              toCurrency as Currency,
            ),
          ).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Cross-currency conversions", () => {
    test("should handle EUR to GBP conversion", () => {
      expect(
        currencyTestAPI.convertPrice(10000, Currency.EUR, Currency.GBP),
      ).toBe(8000); // €100.00 to £80.00
    });

    test("should handle GBP to CHF conversion", () => {
      expect(
        currencyTestAPI.convertPrice(8000, Currency.GBP, Currency.CHF),
      ).toBe(9000); // £80.00 to CHF90.00
    });

    test("should handle CHF to GBP conversion", () => {
      expect(
        currencyTestAPI.convertPrice(9000, Currency.CHF, Currency.GBP),
      ).toBe(8000); // £80.00 to CHF90.00
    });

    test("should be reversible with minimal rounding error", () => {
      const originalAmount = 10; // 100.00 in original currency
      Object.values(Currency).forEach((fromCurrency) => {
        Object.values(Currency).forEach((toCurrency) => {
          if (fromCurrency !== toCurrency) {
            const converted = currencyTestAPI.convertPrice(
              originalAmount,
              fromCurrency as Currency,
              toCurrency as Currency,
            );
            const backConverted = currencyTestAPI.convertPrice(
              converted,
              toCurrency as Currency,
              fromCurrency as Currency,
            );
            // Allow for 1 cent rounding difference
            expect(Math.abs(backConverted - originalAmount)).toBeLessThan(2);
          }
        });
      });
    });
  });

  describe("Error handling", () => {
    test("should throw error for negative amounts", () => {
      expect(() =>
        currencyTestAPI.convertPrice(-100, Currency.USD, Currency.EUR),
      ).toThrow();
    });
  });
});
