import { NextFunction, Request, Response } from "express";
import { config, logger, NodeEnv } from "../config";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../errors";
import type { ProblemDetails } from "@open-source-economy/api-types";

/**
 * Legacy error class for old routes during migration (Phase 5 removal).
 * Replaces the removed ApiError from @open-source-economy/api-types.
 */
class LegacyApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true,
    stack?: string,
  ) {
    super(message);
    this.name = "LegacyApiError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { LegacyApiError };

interface ErrorResponse {
  code: number;
  message: string;
  stack?: string;
}

// =====================================================================
// NEW error middleware (ProblemDetails-based)
// These run BEFORE old middleware so new ApiError instances are caught first
// =====================================================================

/**
 * Catches new ApiError (from src/errors/api-error.ts) and returns ProblemDetails JSON.
 */
export function problemDetailsErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!(err instanceof ApiError)) {
    return next(err);
  }

  logger.warn(
    `${req.method} ${req.url} -> ${err.status} ${err.title}: ${err.detail}`,
  );

  res.status(err.status).json(err.toProblemDetails());
}

/**
 * Catches ts-rest validation errors (RequestValidationError) and returns ProblemDetails.
 * ts-rest throws errors with { paramsResult, queryResult, bodyResult, headersResult }.
 */
export function tsRestValidationErrorHandler(
  err: Error & Record<string, unknown>,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const errorSections: [string, string][] = [
    ["paramsResult", "path"],
    ["queryResult", "query"],
    ["bodyResult", "body"],
    ["headersResult", "header"],
  ];

  const hasTsRestFields = errorSections.some(([key]) => key in err);
  if (!hasTsRestFields) {
    return next(err);
  }

  const errors: Record<string, string[]> = {};

  for (const [key, prefix] of errorSections) {
    const section = err[key];
    if (!section || typeof section !== "object") continue;

    const zodError = section as { issues?: unknown[] };
    if (!Array.isArray(zodError.issues)) continue;

    for (const issue of zodError.issues) {
      if (typeof issue !== "object" || issue === null) continue;
      const zodIssue = issue as {
        path?: (string | number)[];
        message?: string;
        code?: string;
      };
      const fieldPath =
        Array.isArray(zodIssue.path) && zodIssue.path.length > 0
          ? `${prefix}.${zodIssue.path.join(".")}`
          : prefix;
      const message = zodIssue.message ?? zodIssue.code ?? "invalid";

      if (!errors[fieldPath]) {
        errors[fieldPath] = [];
      }
      errors[fieldPath].push(message);
    }
  }

  if (Object.keys(errors).length === 0) {
    return next(err);
  }

  const errorSummary = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join(" | ");

  logger.warn(
    `${req.method} ${req.url} -> 400 Request Validation Error: ${errorSummary}`,
  );

  const problemDetails: ProblemDetails = {
    type: "about:blank",
    title: "Request Validation Error",
    status: 400,
    detail: `Request validation failed: ${errorSummary}`,
    errors,
  };

  res.status(400).json(problemDetails);
}

/**
 * Catch-all error handler. Returns ProblemDetails for any unhandled error.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logger.error(`${req.method} ${req.url} -> 500: ${err.message}`, err.stack);

  const problemDetails: ProblemDetails = {
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    detail:
      config.env === NodeEnv.Production ? "Internal Server Error" : err.message,
  };

  res.status(500).json(problemDetails);
}

// =====================================================================
// LEGACY error middleware (kept for old routes during migration)
// =====================================================================

export function errorConverter(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let error = err;
  if (!(error instanceof LegacyApiError)) {
    const statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Internal Server Error";
    error = new LegacyApiError(statusCode, message, false, err.stack);
  }
  next(error);
}

export function errorHandler(
  err: LegacyApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (config.env === NodeEnv.Local) {
    logger.error(err);
  } else if (
    req.headers.origin === config.frontEndUrl ||
    !(err.statusCode === StatusCodes.NOT_FOUND)
  ) {
    logger.error(err);
  } else {
    logger.warn(
      `Non-frontend 404: ${req.method} ${req.originalUrl} from ${req.ip || "unknown"}`,
    );
  }

  let { statusCode, message } = err;
  if (config.env === NodeEnv.Production && !err.isOperational) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Internal Server Error";
  }

  res.locals.errorMessage = err.message;

  const response: ErrorResponse = {
    code: statusCode,
    message,
    ...(config.env !== NodeEnv.Production && { stack: err.stack }),
  };

  res.status(statusCode).send(response);
}
