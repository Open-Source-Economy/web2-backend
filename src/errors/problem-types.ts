/**
 * RFC 7807 Problem Types
 *
 * Standard problem type URIs for API errors.
 * Format: https://api.open-source-economy.com/problems/{type}
 */

const BASE_URI = "https://api.open-source-economy.com/problems";

export const ProblemType = {
  NOT_FOUND: `${BASE_URI}/not-found`,
  BAD_REQUEST: `${BASE_URI}/bad-request`,
  UNAUTHORIZED: `${BASE_URI}/unauthorized`,
  FORBIDDEN: `${BASE_URI}/forbidden`,
  CONFLICT: `${BASE_URI}/conflict`,
  PAYMENT_REQUIRED: `${BASE_URI}/payment-required`,
  INTERNAL_SERVER_ERROR: `${BASE_URI}/internal-server-error`,
} as const;

export const ProblemTitle = {
  NOT_FOUND: "Not Found",
  BAD_REQUEST: "Bad Request",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  CONFLICT: "Conflict",
  PAYMENT_REQUIRED: "Payment Required",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
} as const;

export const ProblemStatus = {
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  PAYMENT_REQUIRED: 402,
  INTERNAL_SERVER_ERROR: 500,
} as const;
