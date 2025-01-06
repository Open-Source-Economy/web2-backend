import winston from "winston";
import { NodeEnv } from "./NodeEnv";
import { config } from "./config";
import { TransformableInfo } from "logform";

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error && info.stack) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

// Add a winston format to filter debug messages
const filterDebug = winston.format((info) => {
  if (!config.showDebugLogs && info.level === "debug") {
    return false;
  } else {
    return info;
  }
});

export const logger = winston.createLogger({
  level: config.env === NodeEnv.Production ? "info" : "debug",
  format: winston.format.combine(
    filterDebug(),
    enumerateErrorFormat(),
    config.env === NodeEnv.Local
      ? winston.format.colorize()
      : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(
      (info: TransformableInfo) => `${info.level}: ${info.message}`,
    ),
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
      consoleWarnLevels: ["warn"],
      eol: "", // Removes extra newlines
      log: (info, callback) => {
        // Custom log function to bypass console.log prefix
        process.stdout.write(`${info[Symbol.for("message")]}\n`);
        callback();
      },
    }),
  ],
});
