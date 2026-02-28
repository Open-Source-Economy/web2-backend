import type { ISODateTimeString, ISODateString } from "@open-source-economy/api-types";

/**
 * Convert a Date object to an ISODateTimeString branded type.
 * Returns undefined if input is null or undefined.
 */
export function toISODateTimeString(date: Date): ISODateTimeString;
export function toISODateTimeString(date: Date | null | undefined): ISODateTimeString | undefined;
export function toISODateTimeString(date: Date | null | undefined): ISODateTimeString | undefined {
  if (date == null) return undefined;
  return date.toISOString() as ISODateTimeString;
}

/**
 * Convert a Date object to an ISODateString branded type (YYYY-MM-DD).
 * Returns undefined if input is null or undefined.
 */
export function toISODateString(date: Date): ISODateString;
export function toISODateString(date: Date | null | undefined): ISODateString | undefined;
export function toISODateString(date: Date | null | undefined): ISODateString | undefined {
  if (date == null) return undefined;
  return date.toISOString().split("T")[0] as ISODateString;
}
