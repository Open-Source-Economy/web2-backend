import { NextFunction, Request, Response } from "express";
import { config, logger, NodeEnv } from "../config";
import { StatusCodes } from "http-status-codes";
import * as dto from "@open-source-economy/api-types";
import { ApiError } from "@open-source-economy/api-types";

export function errorConverter(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logger.error(err);

  let { statusCode, message } = err;
  if (config.env === NodeEnv.Production && !err.isOperational) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Internal Server Error";
  }

  res.locals.errorMessage = err.message;

  const response: dto.ErrorResponse = {
    code: statusCode,
    message,
    ...(config.env !== NodeEnv.Production && { stack: err.stack }),
  };

  if (config.env === NodeEnv.Local) {
    logger.error(err);
  }

  // Ensure CORS headers are set even on error responses
  const origin = req.headers.origin;
  if (origin) {
    // Allow vercel.app domains in non-production
    if (config.env !== NodeEnv.Production && origin.includes(".vercel.app")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (origin === config.frontEndUrl) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }

  res.status(statusCode).send(response);
}
