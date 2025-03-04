import { NextFunction, Request, Response } from "express";
import { config, logger, NodeEnv } from "../config";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../api/model/error/ApiError";
import { ErrorResponse } from "../api/dto";

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

  const response: ErrorResponse = {
    code: statusCode,
    message,
    ...(config.env !== NodeEnv.Production && { stack: err.stack }),
  };

  if (config.env === NodeEnv.Local) {
    logger.error(err);
  }

  res.status(statusCode).send(response);
}
