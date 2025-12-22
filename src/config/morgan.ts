import morgan from "morgan";
import { Request, Response } from "express";
import { config } from "./config";
import { NodeEnv } from "./NodeEnv";
import { logger } from "./logger";
import { StatusCodes } from "http-status-codes";

morgan.token(
  "message",
  (req: Request, res: Response) => res.locals.errorMessage || "",
);

const getIpFormat = () =>
  config.env === NodeEnv.Production ? ":remote-addr - " : "";

const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

// Create custom morgan stream writers
const successStream = {
  write: (message: string) => {
    const trimmedMessage = message.trim();
    logger.info(trimmedMessage);
  },
};

const errorStream = {
  write: (message: string) => {
    const trimmedMessage = message.trim();
    logger.error(trimmedMessage);
  },
};

// Stream for warnings (non-frontend 404s)
const warningStream = {
  write: (message: string) => {
    const trimmedMessage = message.trim();
    logger.warn(trimmedMessage);
  },
};

// Custom stream that routes to warning or error based on request
const createConditionalErrorStream = () => ({
  write: (message: string, req: Request, res: Response) => {
    const trimmedMessage = message.trim();
    // Check if it's a 404 and not from frontend
    const is404 = res.statusCode === StatusCodes.NOT_FOUND;
    const isFromFrontend = req.headers.origin === config.frontEndUrl;

    if (is404 && !isFromFrontend) {
      logger.warn(trimmedMessage);
    } else {
      logger.error(trimmedMessage);
    }
  },
});

export const successHandler = morgan(successResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode >= 400,
  stream: successStream,
});

// Use a custom format function to access request/response and route accordingly
export const errorHandler = morgan(
  (tokens, req: Request, res: Response) => {
    const is404 = res.statusCode === StatusCodes.NOT_FOUND;
    const isFromFrontend = req.headers.origin === config.frontEndUrl;

    const ip = config.env === NodeEnv.Production ? `${req.ip || ""} - ` : "";
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const status = tokens.status(req, res);
    const responseTime = tokens["response-time"](req, res);
    const message = res.locals.errorMessage || "";

    const logMessage = `${ip}${method} ${url} ${status} - ${responseTime} ms - message: ${message}`;

    if (is404 && !isFromFrontend) {
      logger.warn(logMessage);
    } else {
      logger.error(logMessage);
    }

    return null; // Return null to prevent default morgan output
  },
  {
    skip: (req: Request, res: Response) => res.statusCode < 400,
  },
);
