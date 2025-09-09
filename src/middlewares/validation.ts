import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@open-source-economy/api-types";

/**
 * Custom error class for Joi validation failures.
 * Extends ApiError to integrate with a centralized error handling system.
 */
export class ValidationError extends ApiError {
  public details: Joi.ValidationErrorItem[];

  constructor(
    details: Joi.ValidationErrorItem[],
    message: string = "Validation error",
    stack = "",
  ) {
    super(StatusCodes.BAD_REQUEST, message, true, stack);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Middleware to validate request parameters using a Joi schema.
 * If validation fails, it passes a ValidationError to the next middleware.
 * If successful, validated parameters are assigned to req.params.
 * @param schema Joi.ObjectSchema for params validation.
 */
export const validateParams = (schema: Joi.ObjectSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.error("Params Joi Validation Error:", error);

      next(new ValidationError(error.details, "Invalid request parameters."));
      return;
    }

    // Corrected line: Mutate the existing object instead of reassigning
    Object.assign(req.params, value);
    next();
  };
};

/**
 * Middleware to validate request body using a Joi schema.
 * If validation fails, it passes a ValidationError to the next middleware.
 * If successful, validated body is assigned to req.body.
 * @param schema Joi.ObjectSchema for body validation.
 */
export const validateBody = (schema: Joi.ObjectSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.error("Body Joi Validation Error:", error);

      next(new ValidationError(error.details, "Invalid request body."));
      return;
    }

    // Corrected line: Mutate the existing object instead of reassigning
    Object.assign(req.body, value);
    next();
  };
};

/**
 * Middleware to validate request query parameters using a Joi schema.
 * If validation fails, it passes a ValidationError to the next middleware.
 * If successful, validated query is assigned to req.query.
 * @param schema Joi.ObjectSchema for query validation.
 */
export const validateQuery = (schema: Joi.ObjectSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.error("Query Joi Validation Error:", error);

      next(
        new ValidationError(error.details, "Invalid request query parameters."),
      );
      return;
    }

    // Corrected line: Mutate the existing object instead of reassigning
    Object.assign(req.query, value);
    next();
  };
};
