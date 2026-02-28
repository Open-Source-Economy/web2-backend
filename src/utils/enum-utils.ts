import { Currency } from "@open-source-economy/api-types";
import { ApiError } from "../errors";
import { logger } from "../config";

const STRIPE_TO_CURRENCY: Record<string, Currency> = Object.fromEntries(
  Object.values(Currency).map((c) => [c, c]),
) as Record<string, Currency>;

/** Parse a Stripe currency string into a Currency enum value, or null */
export function parseCurrency(
  value: string | undefined | null,
): Currency | null {
  if (!value) return null;
  return STRIPE_TO_CURRENCY[value.toLowerCase()] ?? null;
}

/** Parse and require a Currency — throws ApiError if invalid */
export function requireCurrency(
  value: string | undefined | null,
  context: string,
): Currency {
  const currency = parseCurrency(value);
  if (!currency)
    throw ApiError.internal(`Unknown currency "${value}" in ${context}`);
  return currency;
}

/** Type-safe assertion for any required enum */
export function requireEnum<T extends string>(
  value: string | undefined | null,
  validValues: T[],
  context: string,
): T {
  if (!value || !validValues.includes(value as T)) {
    throw ApiError.internal(
      `Unknown enum value "${value}" in ${context}, expected one of: ${validValues.join(", ")}`,
    );
  }
  return value as T;
}

/** Type-safe assertion for an optional enum — returns undefined if absent, logs warning if invalid */
export function optionalEnum<T extends string>(
  value: string | undefined | null,
  validValues: T[],
): T | undefined {
  if (!value) return undefined;
  if (validValues.includes(value as T)) return value as T;
  logger.warn(
    `Unknown enum value "${value}", expected one of: ${validValues.join(", ")}`,
  );
  return undefined;
}
