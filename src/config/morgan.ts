import morgan from "morgan";
import { Request, Response } from "express";
import { config } from "./config";
import { NodeEnv } from "./NodeEnv";
import { logger } from "./logger";

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

export const successHandler = morgan(successResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode >= 400,
  stream: successStream,
});

export const errorHandler = morgan(errorResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode < 400,
  stream: errorStream,
});
