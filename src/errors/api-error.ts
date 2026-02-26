import type { ProblemDetails } from "@open-source-economy/api-types";
import { ProblemType, ProblemTitle, ProblemStatus } from "./problem-types";

/**
 * RFC 7807 Problem Details Error
 *
 * Use this class to create standardized API errors.
 * During migration, this coexists with the old ApiError from @open-source-economy/api-types.
 * Import as: import { ApiError } from "../errors";
 */
export class ApiError extends Error implements ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance?: string;
  readonly errors?: Record<string, string[]>;

  private constructor(options: {
    type: keyof typeof ProblemType;
    detail: string;
    instance?: string;
    errors?: Record<string, string[]>;
  }) {
    super(options.detail);
    this.name = "ApiError";
    this.type = ProblemType[options.type];
    this.title = ProblemTitle[options.type];
    this.status = ProblemStatus[options.type];
    this.detail = options.detail;
    this.instance = options.instance;
    this.errors = options.errors;
  }

  /**
   * Convert to plain ProblemDetails object for API response
   */
  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      ...(this.instance && { instance: this.instance }),
      ...(this.errors && { errors: this.errors }),
    };
  }

  static notFound(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "NOT_FOUND",
      detail,
      instance,
    });
  }

  static badRequest(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "BAD_REQUEST",
      detail,
      instance,
    });
  }

  static validationError(
    detail: string,
    errors: Record<string, string[]>,
    instance?: string,
  ): ApiError {
    return new ApiError({
      type: "BAD_REQUEST",
      detail,
      instance,
      errors,
    });
  }

  static unauthorized(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "UNAUTHORIZED",
      detail,
      instance,
    });
  }

  static forbidden(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "FORBIDDEN",
      detail,
      instance,
    });
  }

  static conflict(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "CONFLICT",
      detail,
      instance,
    });
  }

  static paymentRequired(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "PAYMENT_REQUIRED",
      detail,
      instance,
    });
  }

  static internal(detail: string, instance?: string): ApiError {
    return new ApiError({
      type: "INTERNAL_SERVER_ERROR",
      detail,
      instance,
    });
  }
}
